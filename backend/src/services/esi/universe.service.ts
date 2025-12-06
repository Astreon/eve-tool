/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

import { esiApi } from '../../lib/axios.js'
import { toEsiAppError } from '../../lib/axiosErrors.js'
import {
    computeTtlFromHeaders,
    extractCachingHeaders,
} from '../../utils/cacheControl.js'
import type {
    EsiSystemJumpsResponse,
    EsiSystemKillsResponse,
} from '../../types/esi/universe.types.js'

export interface SystemActivity {
    systemId: number
    jumps: number | null
    npcKills: number | null
    shipKills: number | null
    podKills: number | null
}

export interface SystemActivitySnapshot {
    data: Map<number, SystemActivity>
    fetchedAt: Date
    ttlSeconds: number
}

let lastSnapshot: SystemActivitySnapshot | null = null

export async function getSystemActivitySnapshot(): Promise<SystemActivitySnapshot> {
    const now = Date.now()

    if (lastSnapshot) {
        const ageSeconds = (now - lastSnapshot.fetchedAt.getTime()) / 1000
        if (ageSeconds < lastSnapshot.ttlSeconds) {
            return lastSnapshot
        }
    }

    try {
        const [jumpsRes, killsRes] = await Promise.all([
            esiApi.get<EsiSystemJumpsResponse>('/universe/system_jumps'),
            esiApi.get<EsiSystemKillsResponse>('/universe/system_kills'),
        ])

        // TTL from Cache-Control / Expires headers, Fallback 60s
        const jumpMeta = extractCachingHeaders(jumpsRes.headers)
        const killsMeta = extractCachingHeaders(killsRes.headers)

        const ttlJumps = computeTtlFromHeaders(jumpMeta) ?? 60
        const ttlKills = computeTtlFromHeaders(killsMeta) ?? 60
        const ttlSeconds = Math.min(ttlJumps, ttlKills)

        const map = new Map<number, SystemActivity>()

        for (const entry of jumpsRes.data) {
            map.set(entry.system_id, {
                systemId: entry.system_id,
                jumps: entry.ship_jumps,
                npcKills: null,
                shipKills: null,
                podKills: null,
            })
        }

        for (const entry of killsRes.data) {
            const existing = map.get(entry.system_id)
            if (existing) {
                existing.npcKills = entry.npc_kills
                existing.shipKills = entry.ship_kills
                existing.podKills = entry.pod_kills
            } else {
                map.set(entry.system_id, {
                    systemId: entry.system_id,
                    jumps: null,
                    npcKills: entry.npc_kills,
                    shipKills: entry.ship_kills,
                    podKills: entry.pod_kills,
                })
            }
        }

        lastSnapshot = {
            data: map,
            fetchedAt: new Date(now),
            ttlSeconds,
        }

        return lastSnapshot
    } catch (err) {
        throw toEsiAppError(err, {
            op: '/universe/system_jumps + /universe/system_kills',
            resource: 'SystemActivity',
        })
    }
}
