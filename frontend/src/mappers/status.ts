/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

import type {
    ApiStatus,
    EsiRouteHealth,
    StatusPayload,
} from '@/types/status.ts'

export type UiStatus =
    | 'Online'
    | 'Degraded'
    | 'Offline'
    | 'Maintenance'
    | 'Unknown'
export type UiEsiStatus = 'Online' | 'Degraded' | 'Offline' | 'Unknown'

export function mapEsiStatus(overall: EsiRouteHealth | undefined): UiEsiStatus {
    if (!overall) return 'Unknown'

    switch (overall) {
        case 'OK':
            return 'Online'
        case 'Degraded':
        case 'Recovering':
            return 'Degraded'
        case 'Down':
            return 'Offline'
        case 'Unknown':
        default:
            return 'Unknown'
    }
}

export function mapApiStatus(
    apiStatus: ApiStatus | undefined,
    requestFailed: boolean,
): UiStatus {
    if (requestFailed) {
        return 'Offline'
    }

    switch (apiStatus) {
        case 'Up':
            return 'Online'
        case 'Degraded':
            return 'Degraded'
        case 'Down':
            return 'Offline'
        case 'Maintenance':
            return 'Maintenance'
        case 'Unknown':
        default:
            return 'Unknown'
    }
}

export function getPlayersDisplay(
    payload: StatusPayload | undefined,
    requestFailed: boolean,
): string {
    if (requestFailed || !payload) {
        return 'Unknown'
    }

    const players = payload.esi.global.players

    if (players == null) {
        return 'Unknown'
    }

    return players.toLocaleString('de-CH')
}

export function hasWorkerIssues(payload: StatusPayload | undefined): boolean {
    if (!payload?.worker) return false
    const status = payload.worker.overallStatus
    return status === 'Degraded' || status === 'Down'
}
