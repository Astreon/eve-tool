/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

import { useQuery } from '@tanstack/react-query'
import { Badge } from '@/components/ui/badge'
import { ComponentProps } from 'react'
import { API_BASE } from '@/lib/env.ts'

type EsiRouteHealth = 'Unknown' | 'OK' | 'Degraded' | 'Down' | 'Recovering'
type ApiStatus = 'Up' | 'Maintenance' | 'Down' | 'Unknown'

type StatusResponse = {
    success: boolean
    data: {
        api: {
            status: ApiStatus
            uptimeMs: number
        }
        esi: {
            overallStatus: EsiRouteHealth
            global: {
                status: ApiStatus
                players: number | null
                serverVersion: string | null
                startTime: string | null
                latencyMs: number | null
                error: string | null
            }
            routes: {
                method: string
                path: string
                status: EsiRouteHealth | string
            }[]
        }
        maintenance?: {
            isOn: boolean
            reason?: string
            startedAt: string
        }
    }
    meta: {
        ok: boolean
        version: string
    }
}

async function fetchStatus(): Promise<StatusResponse> {
    const res = await fetch(`${API_BASE}/status`)
    if (!res.ok) {
        throw new Error(`Status endpoint failed with HTTP ${res.status}`)
    }
    return (await res.json()) as StatusResponse
}

function useStatusQuery() {
    return useQuery({
        queryKey: ['status'],
        queryFn: fetchStatus,
        staleTime: 60_000,
        refetchInterval: 60_000,
        refetchOnWindowFocus: false,
    })
}

function esiStatusToVariant(
    status: EsiRouteHealth,
): ComponentProps<typeof Badge>['variant'] {
    switch (status) {
        case 'OK':
            return 'success'
        case 'Degraded':
            return 'warning'
        case 'Recovering':
            return 'info'
        case 'Down':
            return 'destructive'
        case 'Unknown':
        default:
            return 'outline'
    }
}

function esiStatusToLabel(status: EsiRouteHealth): string {
    if (status === 'OK') return 'Online'
    return status
}

function apiStatusToVariant(
    status: ApiStatus,
): ComponentProps<typeof Badge>['variant'] {
    switch (status) {
        case 'Up':
            return 'success'
        case 'Maintenance':
            return 'info'
        case 'Down':
            return 'destructive'
        case 'Unknown':
        default:
            return 'outline'
    }
}

function apiStatusToLabel(status: ApiStatus): string {
    switch (status) {
        case 'Up':
            return 'Online'
        case 'Maintenance':
            return 'Maintenance'
        case 'Down':
        default:
            return 'Offline'
    }
}

function StatusPill({
    label,
    status,
    variant,
}: {
    label: string
    status: string
    variant: ComponentProps<typeof Badge>['variant']
}) {
    return (
        <Badge
            variant={variant}
            className="flex items-center gap-1 px-2 py-0.5 font-mono text-xs font-medium"
        >
            <span className="hidden sm:inline">{label}</span>
            <span>{status}</span>
        </Badge>
    )
}

export function StatusBadges() {
    const { data, isLoading, isError } = useStatusQuery()

    if (!data && isError && !isLoading) {
        return null
    }

    const esiOverall: EsiRouteHealth =
        data?.data.esi.overallStatus ?? (isLoading ? 'Unknown' : 'Down')

    const apiStatus: ApiStatus =
        data?.data.api.status ?? (isLoading ? 'Unknown' : 'Down')

    const players = data?.data.esi.global.players ?? null

    return (
        <div className="hidden items-center gap-2 lg:flex">
            {/* Player Count */}
            <Badge
                variant="outline"
                className="px-2 py-0.5 font-mono text-xs tabular-nums"
            >
                {players !== null
                    ? `${players.toLocaleString('de-CH')} Player`
                    : isLoading
                      ? 'Loading…'
                      : 'n/a'}
            </Badge>

            {/* ESI API Status (aggregated) */}
            <StatusPill
                label="ESI"
                status={esiStatusToLabel(esiOverall)}
                variant={esiStatusToVariant(esiOverall)}
            />

            {/* Backend-API */}
            <StatusPill
                label="API"
                status={apiStatusToLabel(apiStatus)}
                variant={apiStatusToVariant(apiStatus)}
            />
        </div>
    )
}
