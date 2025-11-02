import {Response, NextFunction, Request as ExpressRequest} from 'express'
import {redis} from './redis.js'
import config from '../config/config.js'
import {logger} from './logger.js'
import {ApiResponse} from '../types/apiResponse.js'
import {AppError, NotFoundError} from '../types/appError.js'
import type {EsiResult, WithEsiCacheConfig} from '../types/cache.types.js'


export function makeCachedController<TDb, TApi, TEsi>(
    cfg: WithEsiCacheConfig<TDb, TApi, TEsi>
) {
    const fallbackTtl = cfg.fallbackTtlSec ?? config.esiApi.esiFallbackTtlSeconds

    function keys(id: number | string) {
        const v = config.redis.cacheVersion
        const cd = config.esiApi.esiCompatibilityDate
        const base = `${cfg.keyBase}:${v}:${cd}:${id}`
        return {
            data: base,
            etag: `${base}:etag`,
            fresh: `${base}:fresh`,
            lock: `lock:${cfg.keyBase}:${id}`,
            cachedAt: `${base}:cachedAt`,
        }
    }

    return async function handler(
        req: ExpressRequest,
        res: Response<ApiResponse<TApi>>,
        next: NextFunction
    ) {
        const started = Date.now()
        let lockHeld = false

        try {
            // --- 0) ID parsing ( 400 if error)
            const id = cfg.parseId(req)
            const k = keys(id)

            // --- 1) Redis Fast-Path (only if "fresh"-Key exist)
            const cachedStr = await redis.get(k.data)
            if (cachedStr) {
                const isFresh = (await redis.exists(k.fresh)) === 1
                if (isFresh) {
                    const ttlNow = await redis.ttl(k.data)

                    let cachedAt: string | null
                    try {
                        cachedAt = await redis.get(k.cachedAt)
                    } catch {
                        cachedAt = null
                    }

                    const cached: TApi = JSON.parse(cachedStr)
                    logger.entityFromRedis(cfg.kind, id, {ttl: ttlNow, cachedAt, durationMs: Date.now() - started})
                    return res.json({success: true, data: cached})
                }
                // stale-ish → revalidate downstream
            }

            // --- 2) DB-Window (if not expired, deliver DB & refresh Redis)
            const dbRow = await cfg.fetchDb(id)
            const dbMeta = cfg.getDbMeta(dbRow)
            if (dbRow && dbMeta.expiresAt && dbMeta.expiresAt.getTime() > Date.now()) {
                const api = cfg.mapToApi(dbRow)
                const ttlFromDb = Math.max(Math.floor((dbMeta.expiresAt.getTime() - Date.now()) / 1000), 0)

                await redis.set(k.data, JSON.stringify(api), 'EX', Math.max(ttlFromDb, 60))
                if (dbMeta.etag) await redis.set(k.etag, dbMeta.etag, 'EX', Math.max(ttlFromDb, 60))
                await redis.set(k.fresh, '1', 'EX', cfg.freshThresholdSec)
                await redis.set(k.cachedAt, new Date().toISOString(), 'EX', Math.max(ttlFromDb, 60))

                logger.entityFromDb(cfg.kind, id, {
                    lastUpdated: dbMeta.lastModified ? dbMeta.lastModified.toISOString() : undefined,
                    durationMs: Date.now() - started,
                })
                return res.json({success: true, data: api})
            }

            // --- 3) ESI Refresh with Lock (against thundering herd)
            const lockOk = await redis.set(k.lock, '1', 'EX', 15, 'NX')
            lockHeld = lockOk === 'OK'
            if (!lockHeld) {
                if (cachedStr) {
                    const stale: TApi = JSON.parse(cachedStr)
                    logger.info(cfg.kind, `lock busy -> serving stale from Redis for ID=${id}`)
                    return res.json({success: true, data: stale})
                }
                logger.info(cfg.kind, `lock busy & no cache -> continue without lock for ID=${id}`)
            }

            try {
                // ETag aus DB oder Redis (null → undefined normalize)
                const etagRaw: string | null | undefined =
                    dbMeta.etag ?? (await redis.get(k.etag)) ?? undefined
                const etag: string | undefined = etagRaw ?? undefined

                const esi: EsiResult<TEsi> = await cfg.fetchEsi(id, etag)

                // --- 304: unchanged → DB must exist
                if (esi.data === null) {
                    if (!dbRow) return next(new NotFoundError(`${cfg.kind} ${String(id)} not found`))

                    const api = cfg.mapToApi(dbRow)
                    const ttl = (esi.ttl ?? fallbackTtl) | 0

                    await redis.set(k.data, JSON.stringify(api), 'EX', ttl)
                    if (esi.etag) await redis.set(k.etag, esi.etag, 'EX', Math.max(ttl, 60))
                    await redis.set(k.fresh, '1', 'EX', cfg.freshThresholdSec)
                    await redis.set(k.cachedAt, new Date().toISOString(), 'EX', Math.max(ttl, 60))

                    // bump DB-meta data (optional)
                    if (cfg.bumpDbMetaOn304) {
                        await cfg.bumpDbMetaOn304(id, {
                            etag: esi.etag ?? dbMeta.etag ?? null,
                            lastModified: esi.lastModified
                                ? new Date(esi.lastModified)
                                : dbMeta.lastModified ?? null,
                            expiresAt: esi.expires ? new Date(esi.expires) : dbMeta.expiresAt ?? null,
                        })
                    }

                    logger.entityFromEsi(cfg.kind, id, {
                        etag: esi.etag ?? null,
                        ttl,
                        durationMs: Date.now() - started,
                    })
                    return res.json({success: true, data: api})
                }

                // --- 200: fresh data → upsert DB, create Redis
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
                await redis.set(k.cachedAt, new Date().toISOString(), 'EX', Math.max(ttl, 60))

                logger.entityFromEsi(cfg.kind, id, {
                    etag: esi.etag ?? null,
                    ttl,
                    durationMs: Date.now() - started,
                })
                return res.json({success: true, data: api})
            } catch (err) {
                // --- stale-if-error: Redis > DB > error
                if (cachedStr) {
                    const stale: TApi = JSON.parse(cachedStr)
                    logger.info('ESI', `stale-if-error -> served from Redis for ${cfg.kind} ${String(id)}`)
                    return res.json({success: true, data: stale})
                }
                if (dbRow) {
                    const api = cfg.mapToApi(dbRow)
                    logger.info('ESI', `stale-if-error -> served from DB for ${cfg.kind} ${String(id)}`)
                    return res.json({success: true, data: api})
                }
                return next(AppError.fromUnknown(err))
            } finally {
                if (lockHeld) {
                    try {
                        await redis.del(k.lock)
                    } catch {
                        // ignore
                    }
                }
            }
        } catch (e) {
            return next(AppError.fromUnknown(e))
        }
    }
}