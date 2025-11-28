/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

export interface CharacterApiResponse {
    id: number
    name: string
    birthday: Date
    bloodline: string
    corporationId: number
    allianceId: number | null
    race: string
    faction: string | null
    securityStatus: number | null
    gender: 'male' | 'female'
    title: string | null
    description: string | null
}
