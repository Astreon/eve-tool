/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

export type FeatureId =
    | 'search'
    | 'structureSearch'
    | 'location'

export type Feature = {
    id: FeatureId
    name: string
    description: string
    scopes: string[]
    icon: string
    badge?: string
}

export const FEATURES: Feature[] = [
    {
        id: 'search',
        name: 'Search',
        description: 'Search for publicData that match a given sub-string.',
        scopes: [],
        icon: '🔍',
        badge: 'Required'
    },
    {
        id: 'structureSearch',
        name: 'Structure Search',
        description: 'Allows searching over all structures that a character can see in the structure browser.',
        scopes: ['esi-search.search_structures.v1'],
        icon: '🏗️',
        badge: 'Optional',
    },
    {
        id: 'location',
        name: 'Live Location & Route',
        description: 'Current position of ship type.',
        scopes: [
            'esi-location.read_location.v1',
            'esi-location.read_ship_type.v1',
        ],
        icon: '🛰️',
        badge: 'Optional',
    },
]