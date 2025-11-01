// @ts-nocheck
import { describe, it, beforeEach, expect, vi } from 'vitest'
import express from 'express'
import request from 'supertest'

// ───────────────────────────────────────────────────────────────────────────────
// Mocks (hoisting-safe)
// ───────────────────────────────────────────────────────────────────────────────

// 1) config: fixed values (incl DEFAULT_TTL)
vi.mock('../src/config/config.js', () => ({
  default: {
    nodeEnv: 'test',
    cacheVersion: 'vtest',
    esiCompatibilityDate: '2025-09-30',
    esiFallbackTtlSeconds: 86400, // 24h
    esiBaseUrl: 'http://localhost:3100',
  }
}))

// 2) Thresholds: e.g. 60s "fresh"-Window
vi.mock('../src/config/cacheThresholds.js', () => ({
  CACHE_THRESHOLDS: { CHARACTER: 60 }
}))

// 3) Redis (ioredis-similar: get/set/ttl/exists/del with EX/NX)
vi.mock('../src/lib/redis.js', () => {
  type Val = string
  const store = new Map<string, Val>()
  const exp   = new Map<string, number>() // ms timestamp

  const now = () => Date.now()
  const alive = (k: string) => {
    const e = exp.get(k)
    if (e !== undefined && e < now()) { store.delete(k); exp.delete(k); return false }
    return store.has(k)
  }

  function set(key: string, value: string, mode?: string, time?: number, mode2?: string) {
    // ioredis: set(key, value, 'EX', seconds, 'NX'?)
    let nx = false
    let ex: number | undefined
    if (mode === 'EX') ex = typeof time === 'number' ? time : undefined
    if (mode === 'NX' || mode2 === 'NX') nx = true

    if (nx && alive(key)) return null
    store.set(key, value)
    if (ex !== undefined) exp.set(key, now() + ex * 1000)
    else exp.delete(key)
    return 'OK'
  }
  function get(key: string) {
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
    const existed = alive(key)
    store.delete(key); exp.delete(key)
    return existed ? 1 : 0
  }
  function __flushAll() {
    store.clear(); exp.clear()
  }

  return { redis: { set, get, ttl, exists, del, __flushAll } }
})

// 4) Prisma (minimal In-Memory-Store, without unused parameters)
vi.mock('../src/lib/prisma.js', () => {
  type Char = {
    id: number; name: string; corporationId: number
    raceId: number|null; bloodlineId: number|null; securityStatus: number|null
    etag?: string|null; lastModified?: Date|null; expiresAt?: Date|null; updatedAt?: Date
    race?: { name: string } | null; bloodline?: { name: string } | null
  }
  let record: Char | null = null

  const findUnique = vi.fn(async ({ where: { id } }: any) => {
    if (!record || record.id !== id) return null
    return {
      ...record,
      race: record.race ?? (record.raceId ? { name: 'Race' } : null),
      bloodline: record.bloodline ?? (record.bloodlineId ? { name: 'Bloodline' } : null),
    }
  })

  const upsert = vi.fn(async ({ where: { id }, create, update }: any) => {
    if (!record || record.id !== id) {
      record = { ...create, id, updatedAt: new Date() }
    } else {
      record = { ...record, ...update, id, updatedAt: new Date() }
    }
    return {
      ...record,
      race: record.race ?? (record.raceId ? { name: 'Race' } : null),
      bloodline: record.bloodline ?? (record.bloodlineId ? { name: 'Bloodline' } : null),
    }
  })

  const update = vi.fn(async ({ where: { id }, data }: any) => {
    if (!record || record.id !== id) return null
    record = { ...record, ...data, updatedAt: new Date() }
    return record
  })

  const __reset = () => { record = null }

  return {
    prisma: {
      character: { findUnique, upsert, update, __reset }
    }
  }
})

// 5) ESI-Service: mock hoisting-safe (factory give back vi.fn())
vi.mock('../src/services/esi/index.js', () => ({
  getCharacterInfo: vi.fn(),
}))
import * as esi from '../src/services/esi/index.js'
const getCharacterInfo = vi.mocked(esi.getCharacterInfo)

// 6) Logger (silent)
vi.mock('../src/lib/logger.js', () => ({
  logger: {
    info: (_ctx: string, _msg: string, _meta?: any) => {},
    error: (_ctx: string, _msg: string, _meta?: any) => {},
    entityFromRedis: (_k: string, _id: number|string, _m?: any) => {},
    entityFromDb:    (_k: string, _id: number|string, _m?: any) => {},
    entityFromEsi:   (_k: string, _id: number|string, _m?: any) => {},
  }
}))

// ───────────────────────────────────────────────────────────────────────────────
// Imports AFTER mocks
// ───────────────────────────────────────────────────────────────────────────────
import { getCharacter } from '../src/controllers/character.controller.js'
import { redis } from '../src/lib/redis.js'
import { prisma } from '../src/lib/prisma.js'

// Helper-App for supertest
function appFactory() {
  const app = express()
  app.get('/characters/:id', (req, res, next) => getCharacter(req, res, next))
  // minimal error handler
  app.use((err: any, _req: any, res: any, _next: any) => {
    res.status(err?.statusCode ?? 500).json({ success: false, message: err?.message ?? 'error' })
  })
  return app
}

const CHAR_ID = 123
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
    getCharacterInfo.mockResolvedValueOnce({
      data: makePayload('Alpha'),
      etag: '"v1"', ttl: 3600, lastModified: undefined, expires: undefined
    })

    const app = appFactory()
    const res = await request(app).get(`/characters/${CHAR_ID}`)
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.name).toBe('Alpha')

    // Redis keys present?
    expect(await redis.ttl(`character:vtest:2025-09-30:${CHAR_ID}`)).toBeGreaterThan(0)
    expect(await redis.get(`character:vtest:2025-09-30:${CHAR_ID}:etag`)).toBe('"v1"')
    expect(await redis.exists(`character:vtest:2025-09-30:${CHAR_ID}:fresh`)).toBe(1)
  })

  it('B) redis fast-path (fresh-key present)', async () => {
    await redis.set(`character:vtest:2025-09-30:${CHAR_ID}`, JSON.stringify({
      id: CHAR_ID, name: 'Beta', corporation_id: 7, race: 'Race', bloodline: 'Bloodline', security_status: 3.1
    }), 'EX', 7200)
    await redis.set(`character:vtest:2025-09-30:${CHAR_ID}:fresh`, '1', 'EX', 60)

    const app = appFactory()
    const res = await request(app).get(`/characters/${CHAR_ID}`)
    expect(res.status).toBe(200)
    expect(res.body.data.name).toBe('Beta')
    expect(getCharacterInfo).toHaveBeenCalledTimes(0) // no ESI
  })

  it('C) DB-window valid (DB provided, Redis stale-ish)', async () => {
    const future = new Date(Date.now() + 2 * 60 * 60 * 1000)
    await (prisma.character as any).upsert({
      where: { id: CHAR_ID },
      create: {
        id: CHAR_ID, name: 'Gamma', corporationId: 7,
        raceId: 1, bloodlineId: 2, securityStatus: 3.1,
        etag: '"v1"', expiresAt: future
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
    expect(await redis.exists(`character:vtest:2025-09-30:${CHAR_ID}:fresh`)).toBe(1)
  })

  it('D) conditional 304 (DB available, expired)', async () => {
    const past = new Date(Date.now() - 1000)
    await (prisma.character as any).upsert({
      where: { id: CHAR_ID },
      create: {
        id: CHAR_ID, name: 'Delta', corporationId: 7,
        raceId: 1, bloodlineId: 2, securityStatus: 3.1,
        etag: '"v1"', expiresAt: past
      },
      update: {}
    })

    getCharacterInfo.mockResolvedValueOnce({
      data: null, etag: '"v1"', ttl: 120, lastModified: undefined, expires: undefined
    })

    const app = appFactory()
    const res = await request(app).get(`/characters/${CHAR_ID}`)
    expect(res.status).toBe(200)
    expect(res.body.data.name).toBe('Delta')
    expect(await redis.exists(`character:vtest:2025-09-30:${CHAR_ID}:fresh`)).toBe(1)
  })

  it('E) conditional 200 (updated)', async () => {
    const past = new Date(Date.now() - 1000)
    await (prisma.character as any).upsert({
      where: { id: CHAR_ID },
      create: {
        id: CHAR_ID, name: 'Epsilon', corporationId: 7,
        raceId: 1, bloodlineId: 2, securityStatus: 3.1,
        etag: '"v1"', expiresAt: past
      },
      update: {}
    })

    getCharacterInfo.mockResolvedValueOnce({
      data: {
        name: 'Epsilon-UPDATED', corporation_id: 7, race_id: 1, bloodline_id: 2, security_status: 3.1
      },
      etag: '"v2"', ttl: 180, lastModified: undefined, expires: undefined
    })

    const app = appFactory()
    const res = await request(app).get(`/characters/${CHAR_ID}`)
    expect(res.status).toBe(200)
    expect(res.body.data.name).toBe('Epsilon-UPDATED')
    expect(await redis.get(`character:vtest:2025-09-30:${CHAR_ID}:etag`)).toBe('"v2"')
    expect(await redis.exists(`character:vtest:2025-09-30:${CHAR_ID}:fresh`)).toBe(1)
  })

  it('F) stale-if-error -> serve from Redis', async () => {
    await redis.set(`character:vtest:2025-09-30:${CHAR_ID}`, JSON.stringify({
      id: CHAR_ID, name: 'FromCache', corporation_id: 7, race: 'Race', bloodline: 'Bloodline', security_status: 3.1
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
      where: { id: CHAR_ID },
      create: {
        id: CHAR_ID, name: 'FromDB', corporationId: 7,
        raceId: 1, bloodlineId: 2, securityStatus: 3.1,
        etag: '"v1"', expiresAt: past
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
      id: CHAR_ID, name: 'StaleCache', corporation_id: 7, race: 'Race', bloodline: 'Bloodline', security_status: 3.1
    }), 'EX', 600)

    const app = appFactory()
    const res = await request(app).get(`/characters/${CHAR_ID}`)
    expect(res.status).toBe(200)
    expect(res.body.data.name).toBe('StaleCache')
    expect(getCharacterInfo).toHaveBeenCalledTimes(0)
  })
})
