/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

import { ComponentProps } from 'react'
import { useQuery } from '@tanstack/react-query'

import { Badge } from '@/components/ui/badge'
import { API_BASE } from '@/lib/env.ts'
import type { StatusApiResponse } from '@/types/status.ts'
import {
    mapApiStatus,
    mapEsiStatus,
    getPlayersDisplay,
    hasWorkerIssues,
    type UiStatus,
    type UiEsiStatus,
} from '@/mappers/status.ts'

async function fetchStatus(): Promise<StatusApiResponse> {
    const res = await fetch(`${API_BASE}/status`)
    if (!res.ok) {
        throw new Error(`Status endpoint failed with HTTP ${res.status}`)
    }
    return (await res.json()) as StatusApiResponse
}

function useStatusQuery() {
    return useQuery<StatusApiResponse>({
        queryKey: ['status'],
        queryFn: fetchStatus,
        staleTime: 60_000,
        refetchInterval: 60_000,
        refetchOnWindowFocus: false,
    })
}

function esiUiStatusToVariant(
    status: UiEsiStatus,
): ComponentProps<typeof Badge>['variant'] {
    switch (status) {
        case 'Online':
            return 'success'
        case 'Degraded':
            return 'warning'
        case 'Offline':
            return 'destructive'
        case 'Unknown':
        default:
            return 'outline'
    }
}

function apiUiStatusToVariant(
    status: UiStatus,
): ComponentProps<typeof Badge>['variant'] {
    switch (status) {
        case 'Online':
            return 'success'
        case 'Degraded':
            return 'warning'
        case 'Offline':
            return 'destructive'
        case 'Maintenance':
            return 'info'
        case 'Unknown':
        default:
            return 'outline'
    }
}

function StatusPill({
    label,
    status,
    variant,
    subtleHint,
}: {
    label: string
    status: string
    variant: ComponentProps<typeof Badge>['variant']
    subtleHint?: string | null
}) {
    return (
        <Badge
            variant={variant}
            className="flex items-center gap-1 px-2 py-0.5 font-mono text-xs font-medium"
        >
            <span className="hidden sm:inline">{label}</span>
            <span>{status}</span>
            {subtleHint ? (
                <span className="hidden text-[10px] text-amber-500 sm:inline">
                    {subtleHint}
                </span>
            ) : null}
        </Badge>
    )
}

export function StatusBadges() {
    const { data, isLoading, isError } = useStatusQuery()

    const payload = data?.data
    const requestFailed = isError && !isLoading

    const esiUiStatus = mapEsiStatus(payload?.esi.overallStatus)
    const apiUiStatus = mapApiStatus(payload?.api.status, requestFailed)
    const playersLabel = getPlayersDisplay(payload, requestFailed)
    const workerIssue = hasWorkerIssues(payload)

    return (
        <div className="hidden items-center gap-2 lg:flex">
            {/* Player Count */}
            <Badge
                variant="outline"
                className="px-2 py-0.5 font-mono text-xs tabular-nums"
            >
                {isLoading
                    ? 'Loading…'
                    : playersLabel === 'Unknown'
                      ? 'Unknown'
                      : `${playersLabel} Player`}
            </Badge>

            {/* ESI API Status (aggregated) */}
            <StatusPill
                label="ESI"
                status={esiUiStatus}
                variant={esiUiStatusToVariant(esiUiStatus)}
            />

            {/* Backend-API */}
            <StatusPill
                label="API"
                status={apiUiStatus}
                variant={apiUiStatusToVariant(apiUiStatus)}
                subtleHint={
                    workerIssue && apiUiStatus !== 'Offline'
                        ? 'worker issues'
                        : null
                }
            />
        </div>
    )
}
