/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

export interface EsiSystemJumpsEntry {
    ship_jumps: number
    system_id: number
}

export type EsiSystemJumpsResponse = EsiSystemJumpsEntry[]

export interface EsiSystemKillsEntry {
    npc_kills: number
    pod_kills: number
    ship_kills: number
    system_id: number
}

export type EsiSystemKillsResponse = EsiSystemKillsEntry[]
