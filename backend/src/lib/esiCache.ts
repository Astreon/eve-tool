import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { redis } from './redis.js'
import config from '../config/config.js'
import { logger } from './logger.js'
import { ApiResponse } from '../types/apiResponse.js'
import { WithEsiCacheConfig} from "../types/cache.types.js";
import {BadRequestError, NotFoundError} from "../types/appError.js";

export function makeCachedController<TDb, TApi, TEsi>(cfg: WithEsiCacheConfig<TDb, TApi, TEsi>) {
  const fallbackTtl = cfg.fallbackTtlSec ?? config.esiFallbackTtlSeconds

  function keys(id: number | string) {
    const v = config.cacheVersion
    const cd = config.esiCompatibilityDate
    const base = `${cfg.keyBase}:${v}:${cd}:${id}`
    return {
      data: base,
      etag: `${base}:etag`,
      fresh: `${base}:fresh`,
      lock: `lock:${cfg.keyBase}:${id}`,
    }
  }

  return async function handler(
    req: Request,
    res: Response<ApiResponse<TApi>>,
    next: NextFunction
  ) {
    const started = Date.now()
    let lockHeld = false

    try {
      const id = cfg.parseId(req)
      const k = keys(id)

      // 1) Redis Fast-Path
      const cachedStr = await redis.get(k.data)
      if (cachedStr) {
        const isFresh = (await redis.exists(k.fresh)) === 1
        if (isFresh) {
          const ttlNow = await redis.ttl(k.data)
          const cached: TApi = JSON.parse(cachedStr)
          logger.entityFromRedis(cfg.kind, id, { ttl: ttlNow, durationMs: Date.now() - started })
          return res.json({ success: true, data: cached, meta: { source: 'redis', ttl: ttlNow } })
        }
      }

      // 2) DB-Window
      const dbRow = await cfg.fetchDb(id)
      const dbMeta = cfg.getDbMeta(dbRow)
      if (dbRow && dbMeta.expiresAt && dbMeta.expiresAt.getTime() > Date.now()) {
        const api = cfg.mapToApi(dbRow)
        const ttlFromDb = Math.max(Math.floor((dbMeta.expiresAt.getTime() - Date.now()) / 1000), 0)

        await redis.set(k.data, JSON.stringify(api), 'EX', Math.max(ttlFromDb, 60))
        if (dbMeta.etag) await redis.set(k.etag, dbMeta.etag, 'EX', Math.max(ttlFromDb, 60))
        await redis.set(k.fresh, '1', 'EX', cfg.freshThresholdSec)

        logger.entityFromDb(cfg.kind, id, {
          lastUpdated: dbMeta.lastUpdated?.toISOString() ?? null,
          durationMs: Date.now() - started,
        })
        return res.json({ success: true, data: api, meta: { source: 'db', ttl: ttlFromDb } })
      }

      // 3) ESI + Lock
      const lockOk = await redis.set(k.lock, '1', 'EX', 15, 'NX')
      lockHeld = lockOk === 'OK'
      if (!lockHeld) {
        if (cachedStr) {
          const stale: TApi = JSON.parse(cachedStr)
          logger.info(cfg.kind, `lock busy -> serving stale from Redis for ID=${id}`)
          return res.json({ success: true, data: stale, meta: { source: 'redis', stale: true } })
        }
        logger.info(cfg.kind, `lock busy & no cache -> continue without lock for ID=${id}`)
      }

      try {
        const etag = dbMeta.etag ?? (await redis.get(k.etag)) ?? undefined
        const esi = await cfg.fetchEsi(id, etag)

        // 304
        if (esi.data === null) {
          if (!dbRow) return next(new NotFoundError(`${cfg.kind} ${String(id)} not found`))
          const api = cfg.mapToApi(dbRow)
          const ttl = (esi.ttl ?? fallbackTtl) | 0

          await redis.set(k.data, JSON.stringify(api), 'EX', ttl)
          if (esi.etag) await redis.set(k.etag, esi.etag, 'EX', Math.max(ttl, 60))
          await redis.set(k.fresh, '1', 'EX', cfg.freshThresholdSec)

          if (cfg.bumpDbMetaOn304) {
            await cfg.bumpDbMetaOn304(id, {
              etag: esi.etag ?? dbMeta.etag,
              lastModified: esi.lastModified ? new Date(esi.lastModified) : dbMeta.lastModified,
              expiresAt: esi.expires ? new Date(esi.expires) : dbMeta.expiresAt,
              lastUpdated: new Date(),
            })
          }

          logger.entityFromEsi(cfg.kind, id, { etag: esi.etag ?? null, ttl, durationMs: Date.now() - started })
          return res.json({ success: true, data: api, meta: { source: 'esi', etag: esi.etag ?? null, ttl } })
        }

        // 200
        const payload = esi.data!
        const ttl = (esi.ttl ?? fallbackTtl) | 0
        const expiresAt = esi.expires ? new Date(esi.expires) : new Date(Date.now() + ttl * 1000)
        const upserted = await cfg.upsertDbOn200(id, payload, {
          etag: esi.etag ?? null,
          lastModified: esi.lastModified ? new Date(esi.lastModified) : null,
          expiresAt,
        })
        const api = cfg.mapToApi(upserted)

        await redis.set(k.data, JSON.stringify(api), 'EX', ttl)
        if (esi.etag) await redis.set(k.etag, esi.etag, 'EX', Math.max(ttl, 60))
        await redis.set(k.fresh, '1', 'EX', cfg.freshThresholdSec)

        logger.entityFromEsi(cfg.kind, id, { etag: esi.etag ?? null, ttl, durationMs: Date.now() - started })
        return res.json({ success: true, data: api, meta: { source: 'esi', etag: esi.etag ?? null, ttl } })
      } catch (err) {
        // stale-if-error
        if (cachedStr) {
          const stale: TApi = JSON.parse(cachedStr)
          logger.info('ESI', `stale-if-error -> served from Redis for ${cfg.kind} ${String(id)}`)
          return res.json({ success: true, data: stale, meta: { source: 'redis', stale: true } })
        }
        if (dbRow) {
          const api = cfg.mapToApi(dbRow)
          logger.info('ESI', `stale-if-error -> served from DB for ${cfg.kind} ${String(id)}`)
          return res.json({ success: true, data: api, meta: { source: 'db', stale: true } })
        }
        return next(err as any)
      } finally {
        if (lockHeld) {
          try { await redis.del(k.lock) } catch {}
        }
      }
    } catch (e) {
      return next(e as any)
    }
  }
}

export const parseNumericIdFromParams = (paramName = 'id') =>
  (req: Request) => {
    const schema = z.object({ [paramName]: z.coerce.number().int().positive() })
    const result = schema.safeParse(req.params)
    if (!result.success) {
      throw new BadRequestError('Invalid path parameter', z.treeifyError(result.error))
    }
    return result.data[paramName]
  }