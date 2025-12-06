/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button.tsx'
import { StatusBadges } from '@/components/layout/header/status-badges.tsx'
import { API_BASE } from '@/lib/env'

type MaintenanceStatus = {
    success: boolean
    data: {
        maintenance?: {
            isOn: boolean
            reason?: string
            startedAt?: string
        }
    }
}

async function fetchStatus(): Promise<MaintenanceStatus> {
    const res = await fetch(`${API_BASE}/status`)
    if (!res.ok) {
        throw new Error(`Status endpoint failed with HTTP ${res.status}`)
    }
    return (await res.json()) as MaintenanceStatus
}

export function MaintenanceOverlay() {
    const { data } = useQuery({
        queryKey: ['status'],
        queryFn: fetchStatus,
        staleTime: 15_000,
        refetchInterval: 15_000,
        refetchOnWindowFocus: true,
    })

    const maintenance = data?.data.maintenance
    if (!maintenance?.isOn) return null

    const startedAt = maintenance.startedAt
        ? new Date(maintenance.startedAt).toLocaleString()
        : null

    return (
        <div className="bg-background/90 fixed inset-0 z-[60] flex items-center justify-center backdrop-blur-sm">
            <div className="border-border/70 bg-card flex max-w-md flex-col items-center gap-4 rounded-xl border px-6 py-5 shadow-lg">
                <AlertTriangle className="text-destructive h-20 w-20" />
                <h2 className="text-xl font-semibold">Maintenance</h2>
                <p className="text-muted-foreground text-center text-sm">
                    {maintenance.reason ??
                        'The EVE Tool is temporarily unavailable while data updates are running.'}
                </p>
                {startedAt && (
                    <p className="text-muted-foreground text-xs">
                        Started at {startedAt}
                    </p>
                )}
                <Button
                    size="sm"
                    variant="outline"
                    className="mt-2 inline-flex items-center gap-2"
                    onClick={() => window.location.reload()}
                >
                    <RefreshCw className="h-4 w-4" />
                    Reload
                </Button>

                <div className="mt-2 items-center">
                    <StatusBadges />
                </div>
            </div>
        </div>
    )
}
