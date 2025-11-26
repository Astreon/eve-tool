/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

export interface RegionFactionApi {
    id: number
    name: string
}

export interface RegionApiResponse {
    id: number
    name: string
    x: number
    y: number
    z: number
    faction: RegionFactionApi | null
}

export interface RegionLinkApi {
    fromRegionId: number
    toRegionId: number
}
