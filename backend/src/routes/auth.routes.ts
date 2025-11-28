/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

import { Router } from 'express'
import crypto from 'crypto'
import {
    buildAuthUrl,
    exchangeCodeForToken,
    verifyToken,
    refreshToken,
} from '../lib/sso.js'
import { AppError, BadRequestError } from '../types/appError.js'
import { redis } from '../lib/redis.js'
import { prisma } from '../lib/prisma.js'
import { getCharacterInfo } from '../services/esi/index.js'
import config from '../config/config.js'

const router = Router()

const stateKey = (s: string) => `sso:state:${s}`
const STATE_TTL_SECONDS = 60 * 10 // 10 minutes

router.get('/login', async (req, res, next) => {
    try {
        let scopes: string[] = []
        let requestedScopesForState: string[] | undefined

        const rawScopes =
            typeof req.query.scopes === 'string' ? req.query.scopes : undefined

        if (rawScopes && rawScopes.trim() !== '') {
            const requested = rawScopes
                .split(/[,\s]+/)
                .map((s) => s.trim())
                .filter(Boolean)

            const allowed = new Set(config.esiSso.esiSsoScopes)
            const filtered = requested.filter((s) => allowed.has(s))

            scopes = Array.from(new Set(filtered))
            requestedScopesForState = [...scopes]
        }

        if (!scopes.includes('publicData')) {
            scopes.push('publicData')
        }

        const state = crypto.randomBytes(16).toString('hex')

        const statePayload = JSON.stringify(
            requestedScopesForState && requestedScopesForState.length > 0
                ? { scopes: requestedScopesForState }
                : {},
        )

        await redis.set(stateKey(state), statePayload, 'EX', STATE_TTL_SECONDS)

        const url = buildAuthUrl(state, scopes)
        res.json({ success: true, url })
    } catch (e) {
        next(AppError.fromUnknown(e))
    }
})

router.get('/callback', async (req, res, next) => {
    try {
        const code = req.query.code as string | undefined
        const state = req.query.state as string | undefined

        if (!code) {
            next(new BadRequestError('Missing code'))
            return
        }

        if (!state) {
            next(new BadRequestError('Missing state'))
            return
        }

        const key = stateKey(state)
        const rawState = await redis.get(key)

        if (!rawState) {
            next(new BadRequestError('Invalid or expired state', { state }))
            return
        }

        await redis.del(key)

        let requestedScopes: string[] | null = null
        try {
            const parsed = JSON.parse(rawState) as { scopes?: unknown }
            if (Array.isArray(parsed.scopes)) {
                requestedScopes = parsed.scopes
                    .filter((s): s is string => typeof s === 'string')
                    .map((s) => s.trim())
                    .filter(Boolean)
            }
        } catch {}

        const tokens = await exchangeCodeForToken(code)
        const verify = await verifyToken(tokens.access_token)

        const characterId = Number(verify.CharacterID)
        const characterName = verify.CharacterName
        const grantedScopes = verify.Scopes?.split(' ').filter(Boolean) ?? []

        const characterRow = await prisma.character.findUnique({
            where: { id: characterId },
        })

        if (!characterRow) {
            const esi = await getCharacterInfo(characterId)

            if (!esi.data) {
                next(
                    new AppError('ESI character payload missing', {
                        code: 'INTERNAL',
                        details: { characterId },
                    }),
                )
                return
            }

            const payload = esi.data

            if (payload.race_id == null || payload.bloodline_id == null) {
                next(
                    new AppError(
                        'ESI returned null for required fields race_id/bloodline_id',
                        {
                            code: 'INTERNAL',
                            details: {
                                characterId,
                                race_id: payload.race_id,
                                bloodline_id: payload.bloodline_id,
                            },
                        },
                    ),
                )
                return
            }

            const fallbackTtl = config.esiApi.esiFallbackTtlSeconds
            const ttl = (esi.ttl ?? fallbackTtl) | 0
            const expiresAt = esi.expires
                ? new Date(esi.expires)
                : new Date(Date.now() + ttl * 1000)

            await prisma.character.upsert({
                where: { id: characterId },
                create: {
                    id: characterId,
                    name: payload.name,
                    corporationId: payload.corporation_id,
                    raceId: payload.race_id,
                    bloodlineId: payload.bloodline_id,
                    securityStatus: payload.security_status ?? null,
                    etag: esi.etag ?? null,
                    lastModified: esi.lastModified
                        ? new Date(esi.lastModified)
                        : null,
                    expiresAt,
                },
                update: {
                    name: payload.name,
                    corporationId: payload.corporation_id,
                    raceId: payload.race_id,
                    bloodlineId: payload.bloodline_id,
                    securityStatus: payload.security_status ?? null,
                    etag: esi.etag ?? null,
                    lastModified: esi.lastModified
                        ? new Date(esi.lastModified)
                        : null,
                    expiresAt,
                },
            })
        }

        const existingUser = await prisma.user.findUnique({
            where: { characterId },
        })

        const existingScopesArray =
            existingUser?.scopes?.split(' ').filter(Boolean) ?? []

        let nextScopesArray: string[]

        if (requestedScopes && requestedScopes.length > 0) {
            const allowed = new Set(config.esiSso.esiSsoScopes)
            nextScopesArray = Array.from(
                new Set(requestedScopes.filter((s) => allowed.has(s))),
            )
            if (!nextScopesArray.includes('publicData')) {
                nextScopesArray.push('publicData')
            }
        } else if (existingScopesArray.length > 0) {
            nextScopesArray = existingScopesArray
        } else {
            nextScopesArray = grantedScopes
        }

        const nextScopesStr = nextScopesArray.join(' ')

        await prisma.user.upsert({
            where: { characterId },
            update: {
                characterName,
                scopes: nextScopesStr,
                refreshToken: tokens.refresh_token ?? null,
                lastLoginAt: new Date(),
            },
            create: {
                characterId,
                characterName,
                scopes: nextScopesStr,
                refreshToken: tokens.refresh_token ?? null,
                lastLoginAt: new Date(),
            },
        })

        res.json({
            success: true,
            tokens,
            character: {
                id: characterId,
                name: characterName,
                scopes: nextScopesArray,
            },
        })
    } catch (e) {
        next(e)
    }
})

router.post('/refresh', async (req, res, next) => {
    try {
        const { refreshToken: rt } = req.body as { refreshToken?: string }
        if (!rt) {
            next(new BadRequestError('Missing refreshToken'))
            return
        }

        const tokens = await refreshToken(rt)
        const verify = await verifyToken(tokens.access_token)

        const scopesFromToken = verify.Scopes?.split(' ').filter(Boolean) ?? []
        const characterId = Number(verify.CharacterID)
        const characterName = verify.CharacterName

        const existingUser = await prisma.user.findUnique({
            where: { characterId },
        })

        const scopesStr =
            existingUser?.scopes ??
            (scopesFromToken.length > 0
                ? scopesFromToken.join(' ')
                : 'publicData')

        const user = await prisma.user.upsert({
            where: { characterId },
            update: {
                characterName,
                scopes: scopesStr,
                refreshToken: tokens.refresh_token ?? null,
                lastLoginAt: new Date(),
            },
            create: {
                characterId,
                characterName,
                scopes: scopesStr,
                refreshToken: tokens.refresh_token ?? null,
                lastLoginAt: new Date(),
            },
        })

        res.json({
            success: true,
            tokens,
            character: {
                id: characterId,
                name: characterName,
                scopes: user.scopes.split(' ').filter(Boolean),
            },
        })
    } catch (e) {
        next(e)
    }
})

export default router
