// @ts-nocheck
import {describe, it, beforeEach, expect, vi} from 'vitest'
import express from 'express'
import request from 'supertest'

// ── Config & Thresholds ──
vi.mock('../src/config/config.js', () => ({
    default: {
        nodeEnv: 'test',
        cacheVersion: 'vtest',
        esiCompatibilityDate: '2025-09-30',
        esiFallbackTtlSeconds: 86400,
        esiBaseUrl: 'http://localhost:3100',
    }
}))
vi.mock('../src/config/cacheThresholds.js', () => ({
    CACHE_THRESHOLDS: {CHARACTER: 60}
}))

// ── Redis (in-memory) ──
// Note: added PX (ms TTL) support to be robust if something uses it.
vi.mock('../src/lib/redis.js', () => {
    type Val = string
    const store = new Map<string, Val>()
    const exp = new Map<string, number>() // ms timestamp

    const now = () => Date.now()
    const alive = (k: string) => {
        const e = exp.get(k)
        if (e !== undefined && e < now()) {
            store.delete(k);
            exp.delete(k);
            return false
        }
        return store.has(k)
    }

    function set(key: string, value: string, mode?: string, time?: number, mode2?: string) {
        let nx = false
        let ex: number | undefined
        let px: number | undefined

        // Accept either EX (seconds) or PX (milliseconds)
        if (mode === 'EX') ex = typeof time === 'number' ? time : undefined
        else if (mode === 'PX') px = typeof time === 'number' ? time : undefined

        if (mode === 'NX' || mode2 === 'NX') nx = true
        if (nx && alive(key)) return null

        store.set(key, value)

        if (ex !== undefined) exp.set(key, now() + ex * 1000)
        else if (px !== undefined) exp.set(key, now() + px)
        else exp.delete(key)

        return 'OK'
    }

    async function get(key: string) {
        return alive(key) ? (store.get(key) ?? null) : null
    }

    function ttl(key: string) {
        if (!alive(key)) return -2
        const e = exp.get(key)
        if (e === undefined) return -1
        return Math.max(0, Math.floor((e - now()) / 1000))
    }

    function exists(key: string) {
        return alive(key) ? 1 : 0
    }

    function del(key: string) {
        const ok = alive(key);
        store.delete(key);
        exp.delete(key);
        return ok ? 1 : 0
    }

    function __flushAll() {
        store.clear();
        exp.clear()
    }

    return {redis: {set, get, ttl, exists, del, __flushAll}}
})

// ── Prisma (in-memory) ──
vi.mock('../src/lib/prisma.js', () => {
    type Char = {
        id: number; name: string; corporationId: number
        raceId: number | null; bloodlineId: number | null; securityStatus: number | null
        etag?: string | null; lastModified?: Date | null; expiresAt?: Date | null; updatedAt?: Date
        race?: { name: string } | null; bloodline?: { name: string } | null
    }
    let record: Char | null = null

    const findUnique = vi.fn(async ({where: {id}}: any) => {
        if (!record || record.id !== id) return null
        return {
            ...record,
            race: record.race ?? (record.raceId ? {name: 'Race'} : null),
            bloodline: record.bloodline ?? (record.bloodlineId ? {name: 'Bloodline'} : null),
        }
    })

    const upsert = vi.fn(async ({where: {id}, create, update}: any) => {
        if (!record || record.id !== id) record = {...create, id, updatedAt: new Date()}
        else record = {...record, ...update, id, updatedAt: new Date()}
        return {
            ...record,
            race: record.race ?? (record.raceId ? {name: 'Race'} : null),
            bloodline: record.bloodline ?? (record.bloodlineId ? {name: 'Bloodline'} : null),
        }
    })

    const update = vi.fn(async ({where: {id}, data}: any) => {
        if (!record || record.id !== id) return null
        record = {...record, ...data, updatedAt: new Date()}
        return record
    })

    const __reset = () => {
        record = null
    }

    return {prisma: {character: {findUnique, upsert, update, __reset}}}
})

// ── ESI-Service (mock) ──
vi.mock('../src/services/esi/index.js', () => ({getCharacterInfo: vi.fn()}))
import * as esi from '../src/services/esi/index.js'

const getCharacterInfo = vi.mocked(esi.getCharacterInfo)

// ── Logger silent ──
vi.mock('../src/lib/logger.js', () => ({
    logger: {
        info: () => {
        }, error: () => {
        },
        entityFromRedis: () => {
        }, entityFromDb: () => {
        }, entityFromEsi: () => {
        },
    }
}))

// ── CUT ──
import {getCharacter} from '../src/controllers/character.controller.js'
import {redis} from '../src/lib/redis.js'
import {prisma} from '../src/lib/prisma.js'

// Express-App for tests incl Error-Handler (ApiError-Shape)
function appFactory() {
    const app = express()
    app.get('/characters/:id', (req, res, next) => getCharacter(req, res, next))
    app.use((err: any, _req: any, res: any, _next: any) => {
        res.status(err?.statusCode ?? 500).json({success: false, message: err?.message ?? 'error'})
    })
    return app
}

const CHAR_ID = 2123162143
const makePayload = (name = 'John') => ({
    name, corporation_id: 7, race_id: 1, bloodline_id: 2, security_status: 3.1
})

describe('character.controller getCharacter', () => {
    beforeEach(() => {
        ;(redis as any).__flushAll?.()
        ;(prisma.character as any).__reset?.()
        getCharacterInfo.mockReset()
    })

    it('A) cold start -> ESI 200', async () => {
        getCharacterInfo.mockResolvedValueOnce({data: makePayload('Alpha'), etag: '"v1"', ttl: 3600})
        const app = appFactory()
        const res = await request(app).get(`/characters/${CHAR_ID}`)
        expect(res.status).toBe(200)
        expect(res.body.success).toBe(true)
        expect(res.body.data.name).toBe('Alpha')
    })

    it('B) redis fast-path (fresh-key exists)', async () => {
        await redis.set(`character:vtest:2025-09-30:${CHAR_ID}`, JSON.stringify({
            id: CHAR_ID, name: 'Beta', corporation_id: 7, race: 'Race', bloodline: 'Bloodline', security_status: 3.1
        }), 'EX', 7200)
        await redis.set(`character:vtest:2025-09-30:${CHAR_ID}:fresh`, '1', 'EX', 60)

        const app = appFactory()
        const res = await request(app).get(`/characters/${CHAR_ID}`)
        expect(res.status).toBe(200)
        expect(res.body.data.name).toBe('Beta')
        expect(getCharacterInfo).toHaveBeenCalledTimes(0)
    })

    it('C) DB-window valid (DB delivered, Redis stale-ish)', async () => {
        const future = new Date(Date.now() + 2 * 60 * 60 * 1000)
        await (prisma.character as any).upsert({
            where: {id: CHAR_ID},
            create: {
                id: CHAR_ID, name: 'Gamma', corporationId: 7, raceId: 1, bloodlineId: 2,
                securityStatus: 3.1, etag: '"v1"', expiresAt: future
            },
            update: {}
        })

        await redis.set(`character:vtest:2025-09-30:${CHAR_ID}`, JSON.stringify({
            id: CHAR_ID, name: 'OLD', corporation_id: 7, race: 'Race', bloodline: 'Bloodline', security_status: 3.1
        }), 'EX', 7200)

        const app = appFactory()
        const res = await request(app).get(`/characters/${CHAR_ID}`)
        expect(res.status).toBe(200)
        expect(res.body.data.name).toBe('Gamma')
        expect(getCharacterInfo).toHaveBeenCalledTimes(0)
    })

    it('D) conditional 304 (DB exists, expired)', async () => {
        const past = new Date(Date.now() - 1000)
        await (prisma.character as any).upsert({
            where: {id: CHAR_ID},
            create: {
                id: CHAR_ID, name: 'Delta', corporationId: 7, raceId: 1, bloodlineId: 2,
                securityStatus: 3.1, etag: '"v1"', expiresAt: past
            },
            update: {}
        })

        getCharacterInfo.mockResolvedValueOnce({data: null, etag: '"v1"', ttl: 120})

        const app = appFactory()
        const res = await request(app).get(`/characters/${CHAR_ID}`)
        expect(res.status).toBe(200)
        expect(res.body.data.name).toBe('Delta')
    })

    it('E) conditional 200 (updated)', async () => {
        const past = new Date(Date.now() - 1000)
        await (prisma.character as any).upsert({
            where: {id: CHAR_ID},
            create: {
                id: CHAR_ID, name: 'Epsilon', corporationId: 7, raceId: 1, bloodlineId: 2,
                securityStatus: 3.1, etag: '"v1"', expiresAt: past
            },
            update: {}
        })

        getCharacterInfo.mockResolvedValueOnce({
            data: {name: 'Epsilon-UPDATED', corporation_id: 7, race_id: 1, bloodline_id: 2, security_status: 3.1},
            etag: '"v2"', ttl: 180
        })

        const app = appFactory()
        const res = await request(app).get(`/characters/${CHAR_ID}`)
        expect(res.status).toBe(200)
        expect(res.body.data.name).toBe('Epsilon-UPDATED')
    })

    it('F) stale-if-error -> serve from Redis', async () => {
        await redis.set(`character:vtest:2025-09-30:${CHAR_ID}`, JSON.stringify({
            id: CHAR_ID,
            name: 'FromCache',
            corporation_id: 7,
            race: 'Race',
            bloodline: 'Bloodline',
            security_status: 3.1
        }), 'EX', 600)

        getCharacterInfo.mockRejectedValueOnce(new Error('ESI down'))

        const app = appFactory()
        const res = await request(app).get(`/characters/${CHAR_ID}`)
        expect(res.status).toBe(200)
        expect(res.body.data.name).toBe('FromCache')
    })

    it('G) stale-if-error -> serve from DB', async () => {
        const past = new Date(Date.now() - 1000)
        await (prisma.character as any).upsert({
            where: {id: CHAR_ID},
            create: {
                id: CHAR_ID, name: 'FromDB', corporationId: 7, raceId: 1, bloodlineId: 2,
                securityStatus: 3.1, etag: '"v1"', expiresAt: past
            },
            update: {}
        })

        getCharacterInfo.mockRejectedValueOnce(new Error('ESI down'))

        const app = appFactory()
        const res = await request(app).get(`/characters/${CHAR_ID}`)
        expect(res.status).toBe(200)
        expect(res.body.data.name).toBe('FromDB')
    })

    it('H) lock busy -> stale from Redis', async () => {
        await redis.set(`lock:character:${CHAR_ID}`, '1', 'EX', 15)
        await redis.set(`character:vtest:2025-09-30:${CHAR_ID}`, JSON.stringify({
            id: CHAR_ID,
            name: 'StaleCache',
            corporation_id: 7,
            race: 'Race',
            bloodline: 'Bloodline',
            security_status: 3.1
        }), 'EX', 600)

        const app = appFactory()
        const res = await request(app).get(`/characters/${CHAR_ID}`)
        expect(res.status).toBe(200)
        expect(res.body.data.name).toBe('StaleCache')
        expect(getCharacterInfo).toHaveBeenCalledTimes(0)
    })

    // negative: no Cache, no DB, ESI-Error -> 500 + ApiError-Shape
    it('I) error shape (no cache, no db, ESI error)', async () => {
        getCharacterInfo.mockRejectedValueOnce(new Error('down'))
        const app = appFactory()
        const res = await request(app).get(`/characters/${CHAR_ID}`)
        expect(res.status).toBe(500)
        expect(res.body.success).toBe(false)
        expect(typeof res.body.message).toBe('string')
    })

    // Z) invalid :id -> 400 (BadRequest)
    it('Z) invalid id -> 400', async () => {
        const app = appFactory()

        // non-numeric id
        const res1 = await request(app).get('/characters/abc')
        expect(res1.status).toBe(400)
        expect(res1.body.success).toBe(false)
        expect(typeof res1.body.message).toBe('string')

        // out of range
        const res2 = await request(app).get('/characters/1234')
        expect(res2.status).toBe(404)
        expect(getCharacterInfo).toHaveBeenCalledTimes(0)

        // zero / negative (fails zod positive int)
        const res3 = await request(app).get('/characters/0')
        expect(res3.status).toBe(400)

        const res4 = await request(app).get('/characters/-5')
        expect(res4.status).toBe(400)
    })
})
