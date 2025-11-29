// @ts-nocheck
/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import express from 'express'
import request from 'supertest'

// --- Mocks: Config ---
vi.mock('../src/config/config.js', () => ({
    default: {
        nodeEnv: 'test',
        esiApi: {
            esiBaseUrl: 'http://localhost:3100',
            esiCompatibilityDate: '2025-09-30',
            esiFallbackTtlSeconds: 86400,
        },
        esiSso: {
            esiSsoClientId: 'test-client-id',
            esiSsoClientSecret: 'test-client-secret',
            esiSsoRedirectUri: 'https://example.com/callback',
            esiSsoScopes: ['publicData'],
        },
    },
}))

// --- Mocks: Logger ---
vi.mock('../src/lib/logger.js', () => ({
    logger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    },
}))

// --- Mocks: Redis / Prisma ---
vi.mock('../src/lib/redis.js', () => ({
    redis: {
        get: vi.fn(),
        set: vi.fn(),
        del: vi.fn(),
        exists: vi.fn(),
    },
}))

vi.mock('../src/lib/prisma.js', () => ({
    prisma: {
        character: {
            findUnique: vi.fn(),
            upsert: vi.fn(),
        },
    },
}))

// --- Mocks: ESI-Services (getCharacterInfo) ---
// Wichtig: keine top-level Variable, sondern vi.fn() direkt verwenden
vi.mock('../src/services/esi/index.js', () => ({
    getCharacterInfo: vi.fn().mockResolvedValue({
        id: 123,
        name: 'Test Pilot',
        corporationId: 456,
        bloodlineId: 7,
        raceId: 3,
        securityStatus: 5.0,
    }),
}))

// --- Mocks: Axios SSO-Client ---
vi.mock('../src/lib/axios.js', () => ({
    esiApi: {
        get: vi.fn(),
    },
    ssoApi: {
        post: vi.fn(),
    },
}))

// Nach allen Mocks: echte Importe
import authRouter from '../src/routes/auth.routes.js'
import { ssoApi } from '../src/lib/axios.js'

describe.skip('POST /auth/refresh', () => {
    let ssoPostMock: ReturnType<typeof vi.fn>

    function buildApp() {
        const app = express()
        app.use(express.json())
        app.use('/auth', authRouter)
        return app
    }

    beforeEach(() => {
        vi.clearAllMocks()
        ssoPostMock = ssoApi.post as unknown as ReturnType<typeof vi.fn>
    })

    it('returns 200 + success=true + new tokens on successful refresh', async () => {
        const app = buildApp()

        ssoPostMock.mockResolvedValueOnce({
            status: 200,
            data: {
                access_token: 'NEW_ACCESS',
                refresh_token: 'NEW_REFRESH',
                expires_in: 3600,
                token_type: 'Bearer',
            },
        })

        const res = await request(app)
            .post('/auth/refresh')
            .send({ refreshToken: 'OLD_REFRESH' })
            .expect(200)

        expect(res.body.success).toBe(true)

        // hier ggf. an dein echtes Response-Shape anpassen:
        // z. B. res.body.data.tokens.accessToken etc.
        expect(res.body.data).toMatchObject({
            accessToken: expect.any(String),
            refreshToken: expect.any(String),
        })

        expect(ssoPostMock).toHaveBeenCalledTimes(1)
        expect(ssoPostMock).toHaveBeenCalledWith(
            '/oauth/token',
            expect.any(URLSearchParams),
            expect.any(Object),
        )
    })

    it('returns 500 + INTERNAL on SSO error', async () => {
        const app = buildApp()

        ssoPostMock.mockRejectedValueOnce(new Error('SSO exploded'))

        const res = await request(app)
            .post('/auth/refresh')
            .send({ refreshToken: 'OLD_REFRESH' })
            .expect(500)

        expect(res.body.success).toBe(false)
        expect(res.body.error).toBeDefined()
        // ggf. Error-Code anpassen, falls dein globaler Handler etwas anderes zurückgibt
        expect(res.body.error.code).toBe('INTERNAL')
    })
})
