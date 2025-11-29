// @ts-nocheck
/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import express from 'express'
import request from 'supertest'

// Mocks: maintenance-lib
vi.mock('../src/lib/maintenance.js', () => ({
    getMaintenanceInfo: vi.fn(),
}))

// Nach dem Mock: echte Importe
import { maintenanceGuard } from '../src/middlewares/maintenance.js'
import { getMaintenanceInfo } from '../src/lib/maintenance.js'

describe('maintenanceGuard middleware', () => {
    let getMaintenanceInfoMock: ReturnType<typeof vi.fn>

    function buildApp() {
        const app = express()

        app.use(maintenanceGuard)

        app.get('/api/status', (_req, res) => {
            res.json({ ok: true })
        })

        app.get('/api/characters/:id', (_req, res) => {
            res.json({ ok: true })
        })

        return app
    }

    beforeEach(() => {
        vi.clearAllMocks()
        getMaintenanceInfoMock = getMaintenanceInfo as unknown as ReturnType<
            typeof vi.fn
        >

        // Default: Maintenance OFF
        getMaintenanceInfoMock.mockResolvedValue({
            isOn: false,
            reason: undefined,
            startedAt: undefined,
        })
    })

    it('allows /api/status even when maintenance is active', async () => {
        // Maintenance aktiv für diesen Test
        getMaintenanceInfoMock.mockResolvedValue({
            isOn: true,
            reason: 'Test maintenance',
            startedAt: '2025-11-28T12:34:56.000Z',
        })

        const app = buildApp()
        const res = await request(app).get('/api/status').expect(200)

        expect(res.body).toEqual({ ok: true })
    })

    it('blocks /api/characters/:id with 503 MAINTENANCE_MODE when active', async () => {
        // Maintenance aktiv für diesen Test
        getMaintenanceInfoMock.mockResolvedValue({
            isOn: true,
            reason: 'Test maintenance',
            startedAt: '2025-11-28T12:34:56.000Z',
        })

        const app = buildApp()
        const res = await request(app).get('/api/characters/123').expect(503)

        expect(res.body.success).toBe(false)
        expect(res.body.error).toMatchObject({
            code: 'MAINTENANCE_MODE',
        })
    })

    it('passes through normally when maintenance is off', async () => {
        // Hier NICHT überschreiben → default isOn:false aus beforeEach gilt
        const app = buildApp()
        const res = await request(app).get('/api/characters/123').expect(200)

        expect(res.body).toEqual({ ok: true })
    })
})
