import {Request, Response, NextFunction} from "express";
import {UnauthorizedError} from "../types/appError.js";
import {verifyToken} from "../lib/sso.js";

const MAX_ENTRIES = 1000
const MIN_TTL_MS = 5_000                // don't cache shorter than 5s
const MAX_TTL_MS = 5 * 60_000   // don't cache longer than 5min
const SKEW_MS = 2_000                   // subtract to be safe

type VerifyCached = {
    value: {
        CharacterID: number
        CharacterName: string
        ExpiresOn: string
        Scopes: string
        TokenType: 'Bearer'
        CharacterOwnerHash: string
        IntellectualProperty: string
    }
    exp: number // epoch ms
}

const verifyCache = new Map<string, VerifyCached>()

function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n))
}

function getVerifyFromCache(token: string) {
    const hit = verifyCache.get(token)
    if (!hit) return undefined
    if (Date.now() >= hit.exp) {
        verifyCache.delete(token)
        return undefined
    }
    // LRU touch
    verifyCache.delete(token)
    verifyCache.set(token, hit)
    return hit.value
}

function putVerifyInCache(token: string, value: VerifyCached['value']) {
    const now = Date.now()
    const expOn = Date.parse(value.ExpiresOn) // may be NaN if format changes
    const msLeft = isNaN(expOn) ? MIN_TTL_MS : Math.max(0, expOn - now - SKEW_MS)
    const ttl = clamp(msLeft, MIN_TTL_MS, MAX_TTL_MS)

    verifyCache.set(token, {value, exp: now + ttl})
    // simple LRU eviction
    if (verifyCache.size > MAX_ENTRIES) {
        const firstKey = verifyCache.keys().next().value
        if (firstKey) verifyCache.delete(firstKey)
    }
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
    const h = req.get('authorization') ?? req.get('Authorization')
    if (!h || !h.startsWith('Bearer ')) {
        return next(new UnauthorizedError('Missing Bearer token'))
    }

    const token = h.slice('Bearer '.length).trim()
    ;(req as any).esiAccessToken = token

    // 1) try cache
    const cached = getVerifyFromCache(token)
    if (cached) {
        ;(req as any).esiCharacterId = Number(cached.CharacterID)
        ;(req as any).esiCharacterName = cached.CharacterName
        return next()
    }

    // 2) roundtrip to SSO, then cache
    try {
        const v = await verifyToken(token)
        putVerifyInCache(token, v)
        ;(req as any).esiCharacterId = Number(v.CharacterID)
        ;(req as any).esiCharacterName = v.CharacterName
        return next()
    } catch (e) {
        return next(new UnauthorizedError('Invalid or expired token', {cause: e}))
    }
}