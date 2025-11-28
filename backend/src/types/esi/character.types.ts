/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

export interface EsiCharacter {
    alliance_id?: number | null
    birthday: string
    bloodline_id: number
    corporation_id: number
    description?: string | null
    faction_id?: number | null
    gender: 'male' | 'female'
    name: string
    race_id: number
    security_status?: number | null
    title?: string | null
}

export interface EsiCharacterResponse {
    data: EsiCharacter | null
    status: number
    etag?: string | null
    ttl?: number | null
    expires?: string | null
    lastModified?: string | null
}
