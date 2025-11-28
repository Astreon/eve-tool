/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

export interface RegionFactionApi {
    id: number
    name: string
}

export interface RegionLinkApi {
    fromRegionId: number
    toRegionId: number
}

export interface RegionApiResponse {
    id: number
    name: string
    x: number
    y: number
    z: number
    faction: RegionFactionApi | null
}

export interface RegionGraphApiResponse {
    regions: RegionApiResponse[]
    links: RegionLinkApi[]
}

export type SystemBorderType = 'INTERNAL' | 'CONSTELLATION' | 'REGION'

export interface RegionSystemNode {
    id: number
    name: string
    x: number
    y: number
    z: number
    constellationId: number
}

export interface RegionSystemEdge {
    fromSystemId: number
    toSystemId: number
    borderType: SystemBorderType
}

export interface RegionMapApiResponse {
    region: RegionApiResponse
    systems: RegionSystemNode[]
    edges: RegionSystemEdge[]
}
