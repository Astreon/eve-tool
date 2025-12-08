/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

import { esiApi } from '../../lib/axios.js'
import { toEsiAppError } from '../../lib/axiosErrors.js'
import {
    buildConditionalHeaders,
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
    source: 'cache' | 'network'
}

type SystemActivitySnapshotInternal = SystemActivitySnapshot & {
    etagJumps?: string | null
    etagKills?: string | null
}

let lastSnapshot: SystemActivitySnapshotInternal | null = null

export async function getSystemActivitySnapshot(): Promise<SystemActivitySnapshot> {
    const now = Date.now()

    if (lastSnapshot) {
        const ageSeconds = (now - lastSnapshot.fetchedAt.getTime()) / 1000
        if (ageSeconds < lastSnapshot.ttlSeconds) {
            lastSnapshot.source = 'cache'
            return lastSnapshot
        }
    }

    try {
        const conditionalJumpsHeader =
            lastSnapshot && lastSnapshot.etagJumps
                ? buildConditionalHeaders({ etag: lastSnapshot.etagJumps })
                : {}

        const conditionalKillsHeader =
            lastSnapshot && lastSnapshot.etagKills
                ? buildConditionalHeaders({ etag: lastSnapshot.etagKills })
                : {}

        const [jumpsRes, killsRes] = await Promise.all([
            esiApi.get<EsiSystemJumpsResponse>('/universe/system_jumps', {
                headers: conditionalJumpsHeader,
                validateStatus: (status) => status === 200 || status === 304,
            }),
            esiApi.get<EsiSystemKillsResponse>('/universe/system_kills', {
                headers: conditionalKillsHeader,
                validateStatus: (status) => status === 200 || status === 304,
            }),
        ])

        const jumpMeta = extractCachingHeaders(jumpsRes.headers)
        const killsMeta = extractCachingHeaders(killsRes.headers)

        const ttlJumps = computeTtlFromHeaders(jumpMeta) ?? 60
        const ttlKills = computeTtlFromHeaders(killsMeta) ?? 60
        const ttlSeconds = Math.min(ttlJumps, ttlKills)

        // Case 1: Both 304 -> nothing changes, use available snapshot
        if (
            jumpsRes.status === 304 &&
            killsRes.status === 304 &&
            lastSnapshot
        ) {
            lastSnapshot.fetchedAt = new Date(now)
            lastSnapshot.ttlSeconds = ttlSeconds
            lastSnapshot.etagJumps =
                jumpMeta.etag ?? lastSnapshot.etagJumps ?? null
            lastSnapshot.etagKills =
                killsMeta.etag ?? lastSnapshot.etagKills ?? null
            lastSnapshot.source = 'cache'
            return lastSnapshot
        }

        // Case 2: One 304 -> update both snapshot
        if (
            (jumpsRes.status === 304 || killsRes.status === 304) &&
            lastSnapshot
        ) {
            const [freshJumps, freshKills] = await Promise.all([
                esiApi.get<EsiSystemJumpsResponse>('/universe/system_jumps'),
                esiApi.get<EsiSystemKillsResponse>('/universe/system_kills'),
            ])

            const freshJumpsMeta = extractCachingHeaders(freshJumps.headers)
            const freshKillsMeta = extractCachingHeaders(freshKills.headers)

            const ttlJ = computeTtlFromHeaders(freshJumpsMeta) ?? 60
            const ttlK = computeTtlFromHeaders(freshKillsMeta) ?? 60
            const freshTtlSeconds = Math.min(ttlJ, ttlK)

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
                ttlSeconds: freshTtlSeconds,
                source: 'network',
                etagJumps: freshJumpsMeta.etag ?? null,
                etagKills: freshKillsMeta.etag ?? null,
            }

            return lastSnapshot
        }

        // Case 3: Both 200 -> normal snapshot
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
            source: 'network',
            etagJumps: jumpMeta.etag ?? null,
            etagKills: killsMeta.etag ?? null,
        }

        return lastSnapshot
    } catch (err) {
        throw toEsiAppError(err, {
            op: '/universe/system_jumps + /universe/system_kills',
            resource: 'SystemActivity',
        })
    }
}
