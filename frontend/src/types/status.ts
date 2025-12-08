/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

export type ServiceStatus = 'Up' | 'Degraded' | 'Down' | 'Unknown'
export type ApiStatus = 'Up' | 'Degraded' | 'Maintenance' | 'Down' | 'Unknown'
export type EsiRouteHealth =
    | 'Unknown'
    | 'OK'
    | 'Degraded'
    | 'Down'
    | 'Recovering'

export interface EsiGlobalStatus {
    status: ServiceStatus
    players: number | null
    serverVersion: string | null
    startTime: string | null
    latencyMs: number | null
    error: string | null
}

export interface EsiRouteStatus {
    method: string
    path: string
    status: EsiRouteHealth
}

export interface WorkerTaskStatus {
    id: string
    lastSuccessAt?: string
    lastErrorAt?: string
    lastErrorMessage?: string
    lastDurationMs?: number
    runCount: number
    errorCount: number
    status: ServiceStatus
    isStale: boolean
}

export interface WorkerStatus {
    overallStatus: ServiceStatus
    tasks: WorkerTaskStatus[]
}

export interface StatusPayload {
    api: {
        status: ApiStatus
        uptimeMs: number
    }
    esi: {
        overallStatus: EsiRouteHealth
        global: EsiGlobalStatus
        routes: EsiRouteStatus[]
    }
    worker?: WorkerStatus
    maintenance?: {
        isOn: boolean
        reason?: string
        startedAt?: string
    }
}

export interface StatusApiResponse {
    success: boolean
    data: StatusPayload
    meta: {
        ok: boolean
        timestamp: string
    }
}
