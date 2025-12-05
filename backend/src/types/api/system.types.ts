/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

export interface SystemOverviewIndex {
    id: number
    name: string
    securityStatus: number
    securityClass: string | null
    region: {
        id: number
        name: string
    }
    constellation: {
        id: number
        name: string
    }
    faction: {
        id: number
        name: string
    } | null
    planetsCount: number
    moonsCount: number
}

export interface SystemOverviewActivityWindows {
    jumps: number
    npcKills: number
    shipKills: number
    podKills: number
}

export interface SystemOverviewActivity {
    window: 'last_hour'
    jumps: number | null
    npcKills: number | null
    shipKills: number | null
    podKills: number | null
    last24h?: SystemOverviewActivityWindows
}

export interface SystemOverviewMeta {
    fetchedAt: string
    ttlSeconds: number
}

export interface SystemOverviewApiResponse {
    system: SystemOverviewIndex
    activity: SystemOverviewActivity
}
