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
    ServiceStatus,
    WorkerStatus,
    WorkerTaskStatus,
} from '../types/api/status.types.js'
import { CACHE_THRESHOLDS } from '../config/cacheThresholds.js'
import { esiApi } from '../lib/axios.js'
import { USED_ESI_ROUTES } from '../config/esiRoutes.js'
import { logger } from '../lib/logger.js'
import { ApiResponse } from '../types/apiResponse.js'
import { getMaintenanceInfo } from '../lib/maintenance.js'
import { redis } from '../lib/redis.js'

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

// --- Worker Health
const WORKER_TASK_IDS = ['sdeUpdate', 'systemActivity'] as const
type WorkerTaskId = (typeof WORKER_TASK_IDS)[number]

const WORKER_STALE_THRESHOLDS_MS: Record<WorkerTaskId, number> = {
    // sdeUpdate runs once per Day -> stale after 36h
    sdeUpdate: 36 * 60 * 60 * 1000,
    // systemActivity runs once per Hour -> stale after 2h
    systemActivity: 2 * 60 * 60 * 1000,
}

async function fetchWorkerTaskStatus(
    taskId: WorkerTaskId,
): Promise<WorkerTaskStatus> {
    const key = `worker:task:${taskId}:health`
    const hash = await redis.hgetall(key)
    const now = Date.now()

    if (!hash || Object.keys(hash).length === 0) {
        return {
            id: taskId,
            runCount: 0,
            errorCount: 0,
            status: 'Unknown',
            isStale: true,
        }
    }

    const lastSuccessAt = hash.lastSuccessAt
    const lastErrorAt = hash.lastErrorAt
    const lastErrorMessage = hash.lastErrorMessage
    const lastDurationMs = hash.lastDurationMs
        ? Number(hash.lastDurationMs)
        : undefined
    const runCount = hash.runCount ? Number(hash.runCount) : 0
    const errorCount = hash.errorCount ? Number(hash.errorCount) : 0

    let isStale = true
    const thresholdMs = WORKER_STALE_THRESHOLDS_MS[taskId]

    if (lastSuccessAt) {
        const lastSuccessTime = Date.parse(lastSuccessAt)
        if (Number.isFinite(lastSuccessTime)) {
            const diff = now - lastSuccessTime
            isStale = diff > thresholdMs
        }
    }

    let status: ServiceStatus = 'Unknown'

    if (runCount === 0) {
        status = 'Unknown'
    } else if (isStale && errorCount > 0) {
        status = 'Down'
    } else if (errorCount > 0) {
        status = 'Degraded'
    } else if (isStale) {
        status = 'Degraded'
    } else {
        status = 'Up'
    }

    return {
        id: taskId,
        lastSuccessAt,
        lastErrorAt,
        lastErrorMessage,
        lastDurationMs,
        runCount,
        errorCount,
        status,
        isStale,
    }
}

function aggregateWorkerStatus(tasks: WorkerTaskStatus[]): ServiceStatus {
    if (!tasks.length) return 'Unknown'

    if (tasks.some((t) => t.status === 'Down')) return 'Down'
    if (tasks.some((t) => t.status === 'Degraded')) return 'Degraded'
    if (tasks.every((t) => t.status === 'Unknown')) return 'Unknown'
    return 'Up'
}

async function fetchWorkerStatus(): Promise<WorkerStatus | null> {
    try {
        const tasks = await Promise.all(
            WORKER_TASK_IDS.map((id) => fetchWorkerTaskStatus(id)),
        )

        const overallStatus = aggregateWorkerStatus(tasks)

        return {
            overallStatus,
            tasks,
        }
    } catch (err) {
        logger.error('API', 'Failed to fetch worker status from Redis', {
            error: err instanceof Error ? err.message : String(err),
        })
        return null
    }
}

// --- Aggregated status for frontend
export async function getStatus(
    _req: Request,
    res: Response<ApiResponse<StatusApiResponse>>,
) {
    const [esiGlobal, esiAllRoutes, worker] = await Promise.all([
        fetchEsiGlobalStatus(),
        fetchEsiRouteStatuses(),
        fetchWorkerStatus(),
    ])

    const usedRoutes = esiAllRoutes.filter(isUsedRoute)
    const esiOverall: EsiRouteHealth = aggregateEsiHealth(usedRoutes)

    const maintenanceInfo = await getMaintenanceInfo()

    const workerStatus = worker?.overallStatus

    const apiStatus: ApiStatus = maintenanceInfo.isOn
        ? 'Maintenance'
        : workerStatus === 'Down'
          ? 'Down'
          : workerStatus === 'Degraded'
            ? 'Degraded'
            : 'Up'

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
        worker: worker ?? undefined,
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
