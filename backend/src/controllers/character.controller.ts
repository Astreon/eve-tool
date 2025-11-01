import {Request, Response, NextFunction} from 'express'
import {z} from 'zod'
import {prisma} from '../lib/prisma.js'
import {redis} from '../lib/redis.js'
import config from '../config/config.js'
import {CACHE_THRESHOLDS} from '../config/cacheThresholds.js'
import {getCharacterInfo} from '../services/esi/index.js'
import {CharacterApiResponse} from '../types/api.types.js'
import {ApiResponse} from '../types/apiResponse.js'
import {NotFoundError} from '../types/appError.js'
import {mapCharacterToApiResponse} from '../mappers/character.mapper.js'
import {logger} from '../lib/logger.js'

const key = (id: number) => {
    const v = config.cacheVersion
    const cd = config.esiCompatibilityDate
    return {
        data: `character:${v}:${cd}:${id}`,
        etag: `character:${v}:${cd}:${id}:etag`,
        fresh: `character:${v}:${cd}:${id}:fresh`, // ⬅️ neu
        lock: `lock:character:${id}`,
    }
}
const DEFAULT_TTL = config.esiFallbackTtlSeconds

export const getCharacter = async (
    req: Request,
    res: Response<ApiResponse<CharacterApiResponse>>,
    next: NextFunction
) => {
    const started = Date.now()

    try {
        // --- validate params
        const Params = z.object({id: z.coerce.number().int().positive()})
        const {id} = Params.parse(req.params)

        const k = key(id)
        const threshold = CACHE_THRESHOLDS.CHARACTER

        // --- 1) Redis Fast-Path
        const cachedStr = await redis.get(k.data)
        if (cachedStr) {
            const isFresh = (await redis.exists(k.fresh)) === 1 // -2 = non existent, -1 = no TTL, >=0 = sec remaining
            if (isFresh) {
                const cached: CharacterApiResponse = JSON.parse(cachedStr)
                const ttlNow = await redis.ttl(k.data)
                logger.entityFromRedis('CHARACTER', id, {ttl: ttlNow, durationMs: Date.now() - started})
                return res.json({success: true, data: cached})
            }
            // else: stale-ish -> proceed with lock and revalidation
        }

        // --- 2) DB read (incl relations)
        const dbCharacter = await prisma.character.findUnique({
            where: {id},
            include: {
                race: {select: {name: true}},
                bloodline: {select: {name: true}},
            },
        })

        // Cache meta from DB (if exists)
        const dbEtag: string | undefined = (dbCharacter as any)?.etag ?? undefined
        const dbLastUpdated: Date | undefined = (dbCharacter as any)?.updatedAt ?? undefined
        const dbExpiresAt: Date | undefined = (dbCharacter as any)?.expiresAt ?? undefined

        // if between ESI caching window -> get from db and refresh redis
        if (dbCharacter && dbExpiresAt && dbExpiresAt.getTime() > Date.now()) {
            const response = mapCharacterToApiResponse(dbCharacter as any)
            const ttlFromDb = Math.max(Math.floor((dbExpiresAt.getTime() - Date.now()) / 1000), 0)

            await redis.set(k.data, JSON.stringify(response), 'EX', Math.max(ttlFromDb, 60))
            if (dbEtag) await redis.set(k.etag, dbEtag, 'EX', Math.max(ttlFromDb, 60))
            await redis.set(k.fresh, '1', 'EX', threshold)

            logger.entityFromDb('CHARACTER', id, {
                lastUpdated: dbLastUpdated?.toISOString() ?? null,
                durationMs: Date.now() - started,
            })
            return res.json({success: true, data: response})
        }

        // --- 3) ESI Refresh (with lock against Thundering Herd)
        const lockOk = await redis.set(k.lock, '1', 'EX', 15, 'NX')
        if (lockOk !== 'OK') {
            // anyone else is refreshing -> stale from redis (if existing)
            if (cachedStr) {
                const stale: CharacterApiResponse = JSON.parse(cachedStr)
                logger.info('CHARACTER', `lock busy -> serving stale from Redis for ID=${id}`)
                return res.json({success: true, data: stale})
            }
            logger.info('CHARACTER', `lock busy & no cache -> continue without lock for ID=${id}`)
        }

        try {
            const etag = dbEtag ?? (await redis.get(k.etag)) ?? undefined
            const esi = await getCharacterInfo(id, etag)

            // --- 304: not modified
            if (esi.data === null) {
                if (!dbCharacter) return next(new NotFoundError('Character not found'))

                const response = mapCharacterToApiResponse(dbCharacter as any)
                const ttl = (esi.ttl ?? DEFAULT_TTL) | 0

                await redis.set(k.data, JSON.stringify(response), 'EX', ttl)
                if (esi.etag) await redis.set(k.etag, esi.etag, 'EX', Math.max(ttl, 60))
                await redis.set(k.fresh, '1', 'EX', threshold)

                // bump db meta (if existing)
                const dbUpdate: Record<string, any> = {updatedAt: new Date()}
                if (esi.etag) dbUpdate.etag = esi.etag
                if (esi.lastModified) dbUpdate.lastModified = new Date(esi.lastModified)
                if (esi.expires) dbUpdate.expiresAt = new Date(esi.expires)
                await prisma.character.update({where: {id}, data: dbUpdate as any}).catch(() => {
                })

                logger.entityFromEsi('CHARACTER', id, {
                    etag: esi.etag ?? null,
                    ttl,
                    durationMs: Date.now() - started,
                })
                return res.json({success: true, data: response})
            }

            // --- 200: new data
            const payload = esi.data
            if (!payload) return next(new NotFoundError('Character not found'))

            const ttl = (esi.ttl ?? DEFAULT_TTL) | 0
            const expiresAt =
                esi.expires ? new Date(esi.expires) : new Date(Date.now() + ttl * 1000)

            const upserted = await prisma.character.upsert({
                where: {id},
                create: {
                    id,
                    name: payload.name,
                    corporationId: payload.corporation_id,
                    raceId: payload.race_id ?? null,
                    bloodlineId: payload.bloodline_id ?? null,
                    securityStatus: payload.security_status ?? null,
                    etag: esi.etag ?? null,
                    lastModified: esi.lastModified ? new Date(esi.lastModified) : null,
                    expiresAt,
                } as any,
                update: {
                    name: payload.name,
                    corporationId: payload.corporation_id,
                    raceId: payload.race_id ?? null,
                    bloodlineId: payload.bloodline_id ?? null,
                    securityStatus: payload.security_status ?? null,
                    etag: esi.etag ?? null,
                    lastModified: esi.lastModified ? new Date(esi.lastModified) : null,
                    expiresAt,
                } as any,
                include: {
                    race: {select: {name: true}},
                    bloodline: {select: {name: true}},
                },
            })

            const response = mapCharacterToApiResponse(upserted as any)

            await redis.set(k.data, JSON.stringify(response), 'EX', ttl)
            if (esi.etag) await redis.set(k.etag, esi.etag, 'EX', Math.max(ttl, 60))
            await redis.set(k.fresh, '1', 'EX', threshold)

            logger.entityFromEsi('CHARACTER', id, {
                etag: esi.etag ?? null,
                ttl,
                durationMs: Date.now() - started,
            })
            return res.json({success: true, data: response})
        } catch (err) {
            // --- stale-if-error: Redis > DB > proceed error
            if (cachedStr) {
                const stale: CharacterApiResponse = JSON.parse(cachedStr)
                logger.info('ESI', `stale-if-error -> served from Redis for character ${id}`)
                return res.json({success: true, data: stale})
            }
            if (dbCharacter) {
                const fallback = mapCharacterToApiResponse(dbCharacter as any)
                logger.info('ESI', `stale-if-error -> served from DB for character ${id}`)
                return res.json({success: true, data: fallback})
            }
            return next(err as any)
        } finally {
            if (lockOk === 'OK') {
                try {
                    await redis.del(k.lock)
                } catch {
                }
            }
        }
    } catch (e) {
        return next(e as any)
    }
}
