// @ts-nocheck
/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import express from 'express'
import request from 'supertest'

// --- Mocks: Config & Thresholds
vi.mock('../src/config/config.js', () => ({
    default: {
        nodeEnv: 'test',
        esiApi: {
            esiBaseUrl: 'http://localhost:3100',
            esiCompatibilityDate: '2025-09-30',
            esiFallbackTtlSeconds: 86400,
        },
    },
}))

vi.mock('../src/config/cacheThresholds.js', () => ({
    CACHE_THRESHOLDS: {
        ESI_STATUS: 10_000,
        ESI_META: 10_000,
    },
}))

// --- Mocks: USED_ESI_ROUTES
vi.mock('../src/config/esiRoutes.js', () => ({
    USED_ESI_ROUTES: [
        { method: 'GET', path: '/status' },
        { method: 'GET', path: '/meta/status' },
    ],
}))

// --- Mocks: Logger
vi.mock('../src/lib/logger.js', () => ({
    logger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    },
}))

// --- Mocks: ESI-Axios
vi.mock('../src/lib/axios.js', () => ({
    esiApi: {
        get: vi.fn(),
    },
}))

// --- Mocks: Maintenance
vi.mock('../src/lib/maintenance.js', () => ({
    getMaintenanceInfo: vi.fn(),
}))

import { getStatus } from '../src/controllers/status.controller.js'
import { esiApi } from '../src/lib/axios.js'
import { getMaintenanceInfo } from '../src/lib/maintenance.js'

describe('GET /api/status', () => {
    let esiGetMock: ReturnType<typeof vi.fn>
    let getMaintenanceInfoMock: ReturnType<typeof vi.fn>

    beforeEach(() => {
        vi.clearAllMocks()

        esiGetMock = esiApi.get as unknown as ReturnType<typeof vi.fn>
        getMaintenanceInfoMock = getMaintenanceInfo as unknown as ReturnType<
            typeof vi.fn
        >

        // Default: no Maintenance
        getMaintenanceInfoMock.mockResolvedValue({
            isOn: false,
            reason: undefined,
            startedAt: undefined,
        })

        // Default-ESI-Responses
        esiGetMock.mockImplementation(async (url: string) => {
            if (url === '/status') {
                return {
                    status: 200,
                    data: {
                        players: 1234,
                        server_version: '1.2.3',
                        start_time: new Date().toISOString(),
                    },
                }
            }
            if (url === '/meta/status') {
                return {
                    status: 200,
                    data: {
                        routes: [
                            { method: 'GET', path: '/status', status: 'OK' },
                            {
                                method: 'GET',
                                path: '/characters/{character_id}',
                                status: 'OK',
                            },
                        ],
                    },
                }
            }
            throw new Error(`Unexpected ESI URL in test: ${url}`)
        })
    })

    function buildApp() {
        const app = express()
        app.get('/api/status', getStatus)
        return app
    }

    it('returns success with api & esi structure', async () => {
        const app = buildApp()

        const res = await request(app).get('/api/status').expect(200)

        expect(res.body.success).toBe(true)
        expect(res.body.data).toBeDefined()

        const { api, esi, maintenance } = res.body.data

        expect(api).toMatchObject({
            status: 'Up',
            uptimeMs: expect.any(Number),
        })

        expect(esi.global.status).toBe('Up')
        expect(esi.routes.length).toBeGreaterThan(0)

        expect(maintenance).toMatchObject({
            isOn: false,
        })

        expect(esiGetMock).toHaveBeenCalledWith('/status')
        expect(esiGetMock).toHaveBeenCalledWith(
            '/meta/status',
            expect.objectContaining({
                validateStatus: expect.any(Function),
            }),
        )
    })

    it('reflects maintenance=true when maintenance info says so', async () => {
        const app = buildApp()

        getMaintenanceInfoMock.mockResolvedValueOnce({
            isOn: true,
            reason: 'Test maintenance',
            startedAt: '2025-11-28T12:34:56.000Z',
        })

        const res = await request(app).get('/api/status').expect(200)

        expect(res.body.success).toBe(true)

        const { api, maintenance } = res.body.data

        expect(api.status).toBe('Maintenance')
        expect(maintenance).toMatchObject({
            isOn: true,
            reason: 'Test maintenance',
        })
    })
})
