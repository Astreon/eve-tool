/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

import { Request, Response, NextFunction } from 'express'
import { UnauthorizedError } from '../types/appError.js'
import { verifyToken } from '../lib/sso.js'

const MAX_ENTRIES = 1000
const MIN_TTL_MS = 5_000 // don't cache shorter than 5 s
const MAX_TTL_MS = 5 * 60_000 // don't cache longer than 5 min
const SKEW_MS = 2_000 // subtract to be safe

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
    const expOn = Date.parse(value.ExpiresOn) // may be NaN if the format changes
    const msLeft = Number.isNaN(expOn)
        ? MIN_TTL_MS
        : Math.max(0, expOn - now - SKEW_MS)
    const ttl = clamp(msLeft, MIN_TTL_MS, MAX_TTL_MS)

    verifyCache.set(token, { value, exp: now + ttl })
    // simple LRU eviction
    if (verifyCache.size > MAX_ENTRIES) {
        const firstKey = verifyCache.keys().next().value
        if (firstKey) {
            verifyCache.delete(firstKey)
        }
    }
}

export interface AuthedRequest extends Request {
    esiAccessToken: string
    esiCharacterId?: number
    esiCharacterName?: string
}

export async function requireAuth(
    req: Request,
    _res: Response,
    next: NextFunction,
) {
    const authedReq = req as AuthedRequest

    // Express header helper ist schon case-insensitive
    const h = authedReq.header('authorization')

    if (!h?.startsWith('Bearer ')) {
        next(new UnauthorizedError('Missing Bearer token'))
        return
    }

    const token = h.slice('Bearer '.length).trim()
    authedReq.esiAccessToken = token

    // 1) try cache
    const cached = getVerifyFromCache(token)
    if (cached) {
        authedReq.esiCharacterId = Number(cached.CharacterID)
        authedReq.esiCharacterName = cached.CharacterName
        next()
        return
    }

    // 2) roundtrip to SSO, then cache
    try {
        const v = await verifyToken(token)
        putVerifyInCache(token, v)

        authedReq.esiCharacterId = Number(v.CharacterID)
        authedReq.esiCharacterName = v.CharacterName

        next()
    } catch (e) {
        next(new UnauthorizedError('Invalid or expired token', { cause: e }))
    }
}
