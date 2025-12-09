/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

export type ViewMode = 'universe' | 'region'

export type SelectedSystem = {
    id: number
    name: string
    constellationId: number
}

type SystemOverviewStar = {
    spectralClass: string
    temperature: number
    radius: number
    typeName: string | null
}

type SystemOverviewIndex = {
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
    beltsCount?: number
    npcStationsCount?: number
    star: SystemOverviewStar
}

type SystemOverviewActivityWindow = {
    jumps: number
    npcKills: number
    shipKills: number
    podKills: number
}

type SystemOverviewActivity = {
    window: 'last_hour'
    jumps: number | null
    npcKills: number | null
    shipKills: number | null
    podKills: number | null
    last24h?: SystemOverviewActivityWindow
    timeline48h?: SystemActivityPoint[]
}

type SystemActivityPoint = {
    timestamp: string
    jumps: number
    npcKills: number
    shipKills: number
    podKills: number
}

export type SystemOverviewApiResponse = {
    system: SystemOverviewIndex
    activity: SystemOverviewActivity
}

type ApiSuccess<T> = {
    success: true
    data: T
}

type ApiError = {
    success: false
    message: string
    code?: string
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError

export type UniverseToolProps = {
    initialRegionId?: number
}
