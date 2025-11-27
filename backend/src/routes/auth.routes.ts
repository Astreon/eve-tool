/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

import { Router } from 'express'
import * as crypto from 'node:crypto'
import { buildAuthUrl, exchangeCodeForToken, verifyToken } from '../lib/sso.js'
import { redis } from '../lib/redis.js'

const router = Router()

const stateKey = (s: string) => `sso:state:${s}`
const STATE_TTL_SECONDS = 60 * 5 // 5 minutes

router.get('/login', async (req, res, next) => {
    try {
        const state = crypto.randomBytes(16).toString('hex')

        await redis.setex(stateKey(state), STATE_TTL_SECONDS, '1')

        let scopes: string[] | undefined
        const rawScopes = req.query.scopes
        if (typeof rawScopes === 'string' && rawScopes.trim() !== '') {
            scopes = rawScopes
                .split(/[,\s]+/)
                .map((s) => s.trim())
                .filter(Boolean)
        }

        const url = buildAuthUrl(state, scopes)
        res.json({ success: true, url })
    } catch (e) {
        next(e)
    }
})

router.get('/callback', async (req, res, next) => {
    try {
        const { code, state } = req.query

        if (!code || typeof code !== 'string') {
            return res
                .status(400)
                .json({ success: false, message: 'Missing code' })
        }
        if (!state || typeof state !== 'string') {
            return res
                .status(400)
                .json({ success: false, message: 'Missing state' })
        }

        const key = stateKey(state)
        const stateExists = (await redis.exists(key)) === 1
        if (!stateExists) {
            return res
                .status(400)
                .json({ success: false, message: 'Invalid or expired state' })
        }

        await redis.del(key)

        const tokens = await exchangeCodeForToken(code)

        const verify = await verifyToken(tokens.access_token)
        const scopes = verify.Scopes?.split(' ').filter(Boolean)

        res.json({
            success: true,
            tokens,
            character: {
                id: Number(verify.CharacterID),
                name: verify.CharacterName,
                scopes,
            },
        })
    } catch (e) {
        next(e)
    }
})

export default router
