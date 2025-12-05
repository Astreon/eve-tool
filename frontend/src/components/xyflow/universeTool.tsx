/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { UniverseMap } from '@/components/xyflow/universeMap.tsx'
import { RegionMap } from '@/components/xyflow/regionMap.tsx'
import { API_BASE } from '@/lib/env'

type ViewMode = 'universe' | 'region'

type SelectedSystem = {
    id: number
    name: string
    constellationId: number
}

type SystemOverviewIndex = {
    id: number
    name: string
    securityStatus: number
    securityClass: string | null //TODO: Implement Security Colorcoding from FIGMA -> EVE Online
    region: {
        id: number
        name: string
    }
    constellation: {
        id: number
        name: string
    }
    faction: {
        id: number
        name: string
    } | null
    planetsCount: number
    moonsCount: number
}

type SystemOverviewActivity = {
    window: 'last_hour'
    jumps: number | null
    npcKills: number | null
    shipKills: number | null
    podKills: number | null
}

type SystemOverviewApiResponse = {
    system: SystemOverviewIndex
    activity: SystemOverviewActivity
}

type ApiSuccess<T> = {
    success: true
    data: T
}

type ApiError = {
    success: false
    message: string
    code?: string
}

type ApiResponse<T> = ApiSuccess<T> | ApiError

async function fetchSystemOverview(systemId: number): Promise<SystemOverviewApiResponse> {
    const res = await fetch(`${API_BASE}/systems/${systemId}/overview`)

    if (!res.ok) {
        throw new Error(`Failed to fetch system overview (HTTP ${res.status})`)
    }

    const body = (await res.json()) as ApiResponse<SystemOverviewApiResponse>

    if (!body.success) {
        throw new Error(body.message || 'Failed to load system overview')
    }

    return body.data
}

export function UniverseTool() {
    const [mode, setMode] = useState<ViewMode>('universe')
    const [activeRegionId, setActiveRegionId] = useState<number | null>(null)
    const [selectedRegionId, setSelectedRegionId] = useState<number | null>(null)
    const [selectedSystem, setSelectedSystem] = useState<SelectedSystem | null>(null)

    const systemOverviewQuery = useQuery({
        queryKey: ['system-overview', selectedSystem?.id],
        queryFn: () => fetchSystemOverview(selectedSystem!.id),
        enabled: mode === 'region' && !!selectedSystem,
        staleTime: 60_000,
    })

    return (
        <div className="grid h-full grid-cols-[minmax(0,5fr)_minmax(0,1.4fr)] gap-4">
            {/* Linke Seite: Canvas */}
            <div className="border-border overflow-hidden rounded-lg border">
                {mode === 'universe' && (
                    <UniverseMap
                        onRegionClick={(id) => {
                            setSelectedRegionId(id)
                            setSelectedSystem(null)
                        }}
                        onRegionDoubleClick={(id) => {
                            setActiveRegionId(id)
                            setSelectedRegionId(id)
                            setSelectedSystem(null)
                            setMode('region')
                        }}
                    />
                )}

                {mode === 'region' && activeRegionId !== null && (
                    <RegionMap
                        regionId={activeRegionId}
                        onBack={() => {
                            setMode('universe')
                            setSelectedSystem(null)
                        }}
                        onSystemSelect={(system) => {
                            setSelectedSystem({
                                id: system.id,
                                name: system.name,
                                constellationId: system.constellationId,
                            })
                        }}
                    />
                )}
            </div>

            {/* Rechte Seite: Info-Panel */}
            <div className="border-border flex flex-col gap-3 rounded-lg border p-3 text-sm">
                <div className="flex items-center justify-between">
                    <div className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                        {mode === 'universe' ? 'Universe overview' : 'Region details'}
                    </div>
                </div>

                {mode === 'universe' && (
                    <div className="space-y-2 text-xs">
                        {!selectedRegionId && (
                            <p className="text-muted-foreground">
                                Klicke eine Region im Universum an, um sie im Infofenster zu
                                markieren.
                                <br />
                                Doppelklick öffnet die Regionskarte.
                            </p>
                        )}

                        {selectedRegionId && (
                            <div className="space-y-1">
                                <div>
                                    <span className="font-medium">Ausgewählte Region:</span>{' '}
                                    <span className="font-mono">{selectedRegionId}</span>
                                </div>
                                <p className="text-muted-foreground">
                                    Doppelklicke die Region im Canvas, um in die Systemansicht zu
                                    wechseln.
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {mode === 'region' && activeRegionId !== null && (
                    <div className="space-y-3 text-xs">
                        <div>
                            <div className="font-medium">
                                Region <span className="font-mono">{activeRegionId}</span>
                            </div>
                            <p className="text-muted-foreground">
                                Du befindest dich in der Systemansicht dieser Region. Kantenfarbe:
                            </p>
                            <ul className="text-muted-foreground mt-1 list-inside list-disc">
                                <li>
                                    Schwarz/Weiss: Verbindung innerhalb der gleichen Constellation
                                </li>
                                <li>Rot: Verbindung zu System in anderer Constellation</li>
                                <li>Violett: Verbindung zu System in anderer Region</li>
                            </ul>
                        </div>

                        {selectedSystem ? (
                            <div className="space-y-3">
                                <div className="space-y-1">
                                    <div className="font-medium">Ausgewähltes System</div>
                                    <div>
                                        Name:{' '}
                                        <span className="font-mono">{selectedSystem.name}</span>
                                    </div>
                                    <div>
                                        ID: <span className="font-mono">{selectedSystem.id}</span>
                                    </div>
                                    <div>
                                        Constellation:{' '}
                                        <span className="font-mono">
                                            {selectedSystem.constellationId}
                                        </span>
                                    </div>
                                </div>

                                {/* System-Overview */}
                                {systemOverviewQuery.isLoading && (
                                    <p className="text-muted-foreground text-xs">
                                        Lade Systeminformationen…
                                    </p>
                                )}

                                {systemOverviewQuery.isError && (
                                    <p className="text-destructive text-xs">
                                        Konnte Systeminformationen nicht laden.
                                    </p>
                                )}

                                {systemOverviewQuery.isSuccess && (
                                    <div className="grid grid-cols-1 gap-3 text-xs md:grid-cols-2">
                                        {/* Allgemeine Infos */}
                                        <div className="space-y-1">
                                            <div className="font-medium">Allgemein</div>
                                            <div>
                                                Region:{' '}
                                                <span className="font-mono">
                                                    {systemOverviewQuery.data.system.region.name} (
                                                    {systemOverviewQuery.data.system.region.id})
                                                </span>
                                            </div>
                                            <div>
                                                Constellation:{' '}
                                                <span className="font-mono">
                                                    {
                                                        systemOverviewQuery.data.system
                                                            .constellation.name
                                                    }{' '}
                                                    (
                                                    {
                                                        systemOverviewQuery.data.system
                                                            .constellation.id
                                                    }
                                                    )
                                                </span>
                                            </div>
                                            {systemOverviewQuery.data.system.faction && (
                                                <div>
                                                    Faction:{' '}
                                                    <span className="font-mono">
                                                        {
                                                            systemOverviewQuery.data.system.faction
                                                                .name
                                                        }
                                                    </span>
                                                </div>
                                            )}
                                            <div>
                                                Security:{' '}
                                                <span className="font-mono">
                                                    {systemOverviewQuery.data.system.securityStatus.toFixed(
                                                        2,
                                                    )}{' '}
                                                    {systemOverviewQuery.data.system.securityClass
                                                        ? `(${systemOverviewQuery.data.system.securityClass})`
                                                        : ''}
                                                </span>
                                            </div>
                                            <div>
                                                Planeten:{' '}
                                                <span className="font-mono">
                                                    {systemOverviewQuery.data.system.planetsCount}
                                                </span>
                                            </div>
                                            <div>
                                                Monde:{' '}
                                                <span className="font-mono">
                                                    {systemOverviewQuery.data.system.moonsCount}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Aktivität */}
                                        <div className="space-y-1">
                                            <div className="font-medium">
                                                Aktivität (letzte Stunde)
                                            </div>
                                            <div>
                                                Jumps:{' '}
                                                <span className="font-mono">
                                                    {systemOverviewQuery.data.activity.jumps ?? '0'}
                                                </span>
                                            </div>
                                            <div>
                                                NPC Kills:{' '}
                                                <span className="font-mono">
                                                    {systemOverviewQuery.data.activity.npcKills ??
                                                        '0'}
                                                </span>
                                            </div>
                                            <div>
                                                Ship Kills:{' '}
                                                <span className="font-mono">
                                                    {systemOverviewQuery.data.activity.shipKills ??
                                                        '0'}
                                                </span>
                                            </div>
                                            <div>
                                                Pod Kills:{' '}
                                                <span className="font-mono">
                                                    {systemOverviewQuery.data.activity.podKills ??
                                                        '0'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <p className="text-muted-foreground">
                                Klicke ein System im Canvas an, um Details hier anzuzeigen.
                            </p>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
