/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

import { Request, Response } from 'express'
import {
    EsiGlobalStatus,
    EsiRouteStatus,
    EsiRouteHealth,
    StatusApiResponse,
    EsiStatusRaw,
    ApiStatus,
} from '../types/api/status.types.js'
import { CACHE_THRESHOLDS } from '../config/cacheThresholds.js'
import { esiApi } from '../lib/axios.js'
import { USED_ESI_ROUTES } from '../config/esiRoutes.js'
import { logger } from '../lib/logger.js'
import { ApiResponse } from '../types/apiResponse.js'
import { getMaintenanceInfo } from '../lib/maintenance.js'

let cachedGlobalStatus: EsiGlobalStatus | null = null
let cachedGlobalStatusFetchedAt = 0

let cachedRouteStatuses: EsiRouteStatus[] | null = null
let cachedRouteStatusesFetchedAt = 0

// --- ESI Global Status (/status)
async function fetchEsiGlobalStatus(): Promise<EsiGlobalStatus> {
    const now = Date.now()
    if (
        cachedGlobalStatus &&
        now - cachedGlobalStatusFetchedAt < CACHE_THRESHOLDS.ESI_STATUS
    ) {
        return cachedGlobalStatus
    }

    const base: EsiGlobalStatus = {
        status: 'Unknown',
        players: null,
        serverVersion: null,
        startTime: null,
        latencyMs: null,
        error: null,
    }

    const t0 = performance.now()
    try {
        const res = await esiApi.get('/status')
        base.latencyMs = Math.round(performance.now() - t0)

        if (
            res.status >= 200 &&
            res.status < 300 &&
            res.data &&
            typeof res.data === 'object'
        ) {
            const data = res.data as EsiStatusRaw
            base.status = 'Up'
            base.players =
                typeof data.players === 'number' ? data.players : null
            base.serverVersion =
                typeof data.server_version === 'string'
                    ? data.server_version
                    : null
            base.startTime =
                typeof data.start_time === 'string' ? data.start_time : null
        } else {
            base.status = 'Down'
            base.error = `HTTP ${res.status}`
        }
    } catch (err: unknown) {
        base.status = 'Down'
        base.latencyMs = Math.round(performance.now() - t0)
        base.error = err instanceof Error ? err.message : 'Unknown error'
    }

    cachedGlobalStatus = base
    cachedGlobalStatusFetchedAt = now
    return base
}

// --- ESI Route-Status (/meta/status)
interface RawMetaRoute {
    method?: string
    path?: string
    status?: string
    [key: string]: unknown
}

async function fetchEsiRouteStatuses(): Promise<EsiRouteStatus[]> {
    const now = Date.now()
    if (
        cachedRouteStatuses &&
        now - cachedRouteStatusesFetchedAt < CACHE_THRESHOLDS.ESI_META
    ) {
        return cachedRouteStatuses
    }

    try {
        const res = await esiApi.get('/meta/status', {
            validateStatus: () => true,
        })

        if (res.status < 200 || res.status >= 300 || !res.data) {
            cachedRouteStatuses = []
            cachedRouteStatusesFetchedAt = now
            return cachedRouteStatuses
        }

        const body = res.data as { routes?: RawMetaRoute[] }

        if (!body || !Array.isArray(body.routes)) {
            logger.warn('ESI', '/meta/status body did not contain routes[]', {
                keys: body ? Object.keys(body) : null,
            })
            cachedRouteStatuses = []
            cachedRouteStatusesFetchedAt = now
            return cachedRouteStatuses
        }

        const mapped: EsiRouteStatus[] = body.routes.map((r) => ({
            method: typeof r.method === 'string' ? r.method : '',
            path: typeof r.path === 'string' ? r.path : '',
            status: (typeof r.status === 'string'
                ? r.status
                : 'Unknown') as EsiRouteHealth,
        }))

        cachedRouteStatuses = mapped
        cachedRouteStatusesFetchedAt = now
        return mapped
    } catch (e) {
        logger.error('ESI', 'Failed to fetch /meta/status', {
            error: e instanceof Error ? e.message : String(e),
        })

        cachedRouteStatuses = []
        cachedRouteStatusesFetchedAt = now
        return cachedRouteStatuses
    }
}

function isUsedRoute(route: EsiRouteStatus): boolean {
    return USED_ESI_ROUTES.some(
        (u) => u.method === route.method && u.path === route.path,
    )
}

function normalizeHealth(status: string | undefined): EsiRouteHealth {
    switch (status) {
        case 'OK':
        case 'Degraded':
        case 'Down':
        case 'Recovering':
        case 'Unknown':
            return status
        default:
            return 'Unknown'
    }
}

function aggregateEsiHealth(routes: EsiRouteStatus[]): EsiRouteHealth {
    if (!routes.length) return 'Unknown'

    const statuses = routes.map((r) => normalizeHealth(r.status))

    if (statuses.some((s) => s === 'Down')) return 'Down'
    if (statuses.some((s) => s === 'Degraded')) return 'Degraded'
    if (statuses.some((s) => s === 'Recovering')) return 'Recovering'
    if (statuses.some((s) => s === 'OK')) return 'OK'

    return 'Unknown'
}

// --- Aggregated status for frontend
export async function getStatus(
    _req: Request,
    res: Response<ApiResponse<StatusApiResponse>>,
) {
    const [esiGlobal, esiAllRoutes] = await Promise.all([
        fetchEsiGlobalStatus(),
        fetchEsiRouteStatuses(),
    ])

    const usedRoutes = esiAllRoutes.filter(isUsedRoute)

    const esiOverall: EsiRouteHealth =
        esiGlobal.status === 'Down' ? 'Down' : aggregateEsiHealth(usedRoutes)

    const maintenanceInfo = await getMaintenanceInfo()

    const apiStatus: ApiStatus = maintenanceInfo.isOn ? 'Maintenance' : 'Up'

    const api: StatusApiResponse['api'] = {
        status: apiStatus,
        uptimeMs: Math.round(process.uptime() * 1000),
    }

    const ok = api.status === 'Up' && esiOverall !== 'Down'

    const data: StatusApiResponse = {
        api,
        esi: {
            overallStatus: esiOverall,
            global: esiGlobal,
            routes: usedRoutes,
        },
        maintenance: {
            isOn: maintenanceInfo.isOn,
            reason: maintenanceInfo.reason,
            startedAt: maintenanceInfo.startedAt,
        },
    }

    return res.json({
        success: true,
        data,
        meta: {
            ok,
            timestamp: new Date().toISOString(),
        },
    })
}
