/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { UniverseMap } from '@/components/xyflow/universeMap.tsx'
import { RegionMap } from '@/components/xyflow/regionMap.tsx'
import { API_BASE } from '@/lib/env'
import {
    ChartConfig,
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from '@/components/ui/chart'
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts'
import { cn } from '@/lib/utils.ts'
import { formatSecurity, getSecurityClassName } from '@/lib/security.ts'
import { useRouter } from '@tanstack/react-router'

type ViewMode = 'universe' | 'region'

type SelectedSystem = {
    id: number
    name: string
    constellationId: number
}

type SystemOverviewStar = {
    spectralClass: string
    temperature: number
    radius: number
    typeName: string | null
}

type SystemOverviewIndex = {
    id: number
    name: string
    securityStatus: number
    securityClass: string | null
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
    beltsCount?: number
    npcStationsCount?: number
    star: SystemOverviewStar
}

type SystemOverviewActivityWindow = {
    jumps: number
    npcKills: number
    shipKills: number
    podKills: number
}

type SystemOverviewActivity = {
    window: 'last_hour'
    jumps: number | null
    npcKills: number | null
    shipKills: number | null
    podKills: number | null
    last24h?: SystemOverviewActivityWindow
    timeline48h?: SystemActivityPoint[]
}

type SystemActivityPoint = {
    timestamp: string
    jumps: number
    npcKills: number
    shipKills: number
    podKills: number
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

type UniverseToolProps = {
    initialRegionId?: number
}

async function fetchSystemOverview(
    systemId: number,
): Promise<SystemOverviewApiResponse> {
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

export function UniverseTool({ initialRegionId }: UniverseToolProps = {}) {
    const [mode, setMode] = useState<ViewMode>('universe')
    const [activeRegionId, setActiveRegionId] = useState<number | null>(null)
    const [selectedRegionId, setSelectedRegionId] = useState<number | null>(
        null,
    )
    const [selectedSystem, setSelectedSystem] = useState<SelectedSystem | null>(
        null,
    )

    const router = useRouter()

    useEffect(() => {
        if (initialRegionId != null) {
            setMode('region')
            setActiveRegionId(initialRegionId)
            setSelectedRegionId(initialRegionId)
            setSelectedSystem(null)
        }
    }, [initialRegionId])

    const systemOverviewQuery = useQuery({
        queryKey: ['system-overview', selectedSystem?.id],
        queryFn: () => fetchSystemOverview(selectedSystem!.id),
        enabled: mode === 'region' && !!selectedSystem,
        staleTime: 60_000,
    })

    const activity = systemOverviewQuery.data?.activity

    const MAX_POINTS = 48
    const rawTimeline = activity?.timeline48h ?? []

    const paddedTimeline =
        rawTimeline.length >= MAX_POINTS
            ? rawTimeline.slice(rawTimeline.length - MAX_POINTS)
            : [
                  ...Array.from(
                      { length: MAX_POINTS - rawTimeline.length },
                      () => ({
                          jumps: 0,
                          npcKills: 0,
                          shipKills: 0,
                          podKills: 0,
                          timestamp: null as string | null,
                      }),
                  ),
                  ...rawTimeline,
              ]

    const chartData = paddedTimeline.map((point, index) => ({
        hour: index,
        jumps: point.jumps ?? 0,
        npcKills: point.npcKills ?? 0,
        shipKills: point.shipKills ?? 0,
        podKills: point.podKills ?? 0,
        timestamp: point.timestamp ?? null,
    }))

    const maxHourIndex = chartData.length > 0 ? chartData.length - 1 : 0

    const formatXAxisTick = (value: number) => {
        const hoursAgo = maxHourIndex - value
        if (hoursAgo < 0) return ''
        return hoursAgo % 6 === 0 ? `${hoursAgo}h` : ''
    }

    const formatYAxisTick = (value: number) => {
        const abs = Math.abs(value)
        if (abs >= 1000) {
            const v = value / 1000
            const rounded = Math.round(v * 10) / 10
            return Number.isInteger(rounded)
                ? `${rounded.toFixed(0)}k`
                : `${rounded.toFixed(1)}k`
        }
        return value.toString()
    }

    const chartConfig = {
        jumps: {
            label: 'Jumps',
            color: 'var(--chart-1)',
        },
        npcKills: {
            label: 'NPC Kills',
            color: 'var(--chart-2)',
        },
        shipKills: {
            label: 'Ship Kills',
            color: 'var(--chart-3)',
        },
        podKills: {
            label: 'Pod Kills',
            color: 'var(--chart-4)',
        },
    } satisfies ChartConfig

    const formatTooltipLabel = (_label: unknown, payload: unknown[]) => {
        if (!payload?.length) return null

        const first: any = payload[0]
        const ts = first?.payload?.timestamp as string | undefined
        if (!ts) return null

        const date = new Date(ts)
        const now = Date.now()
        const diffMs = now - date.getTime()
        const diffHours = Math.round(diffMs / (1000 * 60 * 60))

        const pad = (n: number) => n.toString().padStart(2, '0')

        const month = pad(date.getMonth() + 1)
        const day = pad(date.getDate())
        const hours = pad(date.getHours())
        const minutes = pad(date.getMinutes())

        return `${month}-${day} / ${hours}:${minutes} (${diffHours}h ago)`
    }

    return (
        <div className="grid gap-4 lg:h-full lg:grid-cols-[minmax(0,5fr)_minmax(0,1.4fr)]">
            {/* Left: Canvas */}
            <div className="border-border h-[60vh] min-h-[320px] overflow-hidden rounded-lg border lg:h-full">
                {mode === 'universe' && (
                    <UniverseMap
                        onRegionClick={(id) => {
                            setSelectedRegionId(id)
                            setSelectedSystem(null)
                        }}
                        onRegionDoubleClick={(id, name) => {
                            setActiveRegionId(id)
                            setSelectedRegionId(id)
                            setSelectedSystem(null)
                            setMode('region')

                            if (name) {
                                const slug = encodeURIComponent(name)
                                router.navigate({
                                    to: '/universe/region/$regionName',
                                    params: { regionName: slug },
                                })
                            }
                        }}
                    />
                )}

                {mode === 'region' && activeRegionId !== null && (
                    <RegionMap
                        regionId={activeRegionId}
                        onBack={() => {
                            setMode('universe')
                            setSelectedSystem(null)
                            setSelectedRegionId(null)
                            setActiveRegionId(null)

                            router.navigate({ to: '/universe' })
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

            {/* Right: Info panel */}
            <div className="border-border flex flex-col gap-3 rounded-lg border p-3 text-sm lg:max-h-full lg:overflow-y-auto">
                <div className="flex items-center justify-between">
                    <div className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                        {mode === 'universe'
                            ? 'Region details'
                            : 'System details'}
                    </div>
                </div>

                {mode === 'universe' && (
                    <div className="space-y-2 text-xs">
                        {!selectedRegionId && (
                            <p className="text-muted-foreground">
                                Click a region in the universe to highlight it
                                in the info panel.
                                <br />
                                Double-click to open the region map.
                            </p>
                        )}

                        {selectedRegionId && (
                            <div className="space-y-1">
                                <div>
                                    <span className="font-medium">
                                        Selected region:
                                    </span>{' '}
                                    <span className="font-mono">
                                        {selectedRegionId}
                                    </span>
                                </div>
                                <p className="text-muted-foreground">
                                    Double-click the region in the canvas to
                                    switch to the system view.
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {mode === 'region' && activeRegionId !== null && (
                    <div className="space-y-3 text-xs">
                        {selectedSystem ? (
                            <div className="space-y-1">
                                {/* System overview */}
                                {systemOverviewQuery.isLoading && (
                                    <p className="text-muted-foreground text-xs">
                                        Loading system information...
                                    </p>
                                )}

                                {systemOverviewQuery.isError && (
                                    <p className="text-destructive text-xs">
                                        Failed to load system information.
                                    </p>
                                )}

                                {systemOverviewQuery.isSuccess && (
                                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-2">
                                        {/* General */}
                                        <div className="bg-muted/40 space-y-1 rounded-md p-2">
                                            <div className="font-medium">
                                                General
                                            </div>
                                            <div>
                                                Name:{' '}
                                                <span className="font-mono">
                                                    {selectedSystem.name} (
                                                    {selectedSystem.id})
                                                </span>
                                            </div>
                                            <div>
                                                Region:{' '}
                                                <span className="font-mono">
                                                    {
                                                        systemOverviewQuery.data
                                                            .system.region.name
                                                    }{' '}
                                                    (
                                                    {
                                                        systemOverviewQuery.data
                                                            .system.region.id
                                                    }
                                                    )
                                                </span>
                                            </div>
                                            <div>
                                                Constellation:{' '}
                                                <span className="font-mono">
                                                    {
                                                        systemOverviewQuery.data
                                                            .system
                                                            .constellation.name
                                                    }{' '}
                                                    (
                                                    {
                                                        systemOverviewQuery.data
                                                            .system
                                                            .constellation.id
                                                    }
                                                    )
                                                </span>
                                            </div>
                                            {systemOverviewQuery.data.system
                                                .faction && (
                                                <div>
                                                    Faction:{' '}
                                                    <span className="font-mono">
                                                        {
                                                            systemOverviewQuery
                                                                .data.system
                                                                .faction.name
                                                        }
                                                    </span>
                                                </div>
                                            )}
                                            <div>
                                                Security Level:{' '}
                                                <span
                                                    className={cn(
                                                        'eve-security-badge',
                                                        getSecurityClassName(
                                                            systemOverviewQuery
                                                                .data.system
                                                                .securityStatus,
                                                        ),
                                                    )}
                                                >
                                                    {formatSecurity(
                                                        systemOverviewQuery.data
                                                            .system
                                                            .securityStatus,
                                                    )}
                                                </span>
                                                {systemOverviewQuery.data.system
                                                    .securityClass && (
                                                    <span className="font-mono">
                                                        {' '}
                                                        (
                                                        {
                                                            systemOverviewQuery
                                                                .data.system
                                                                .securityClass
                                                        }
                                                        )
                                                    </span>
                                                )}
                                            </div>
                                            <div className="mt-3 space-y-1">
                                                <div>
                                                    Planets:{' '}
                                                    <span className="font-mono">
                                                        {
                                                            systemOverviewQuery
                                                                .data.system
                                                                .planetsCount
                                                        }
                                                    </span>
                                                </div>
                                                <div>
                                                    Moons:{' '}
                                                    <span className="font-mono">
                                                        {
                                                            systemOverviewQuery
                                                                .data.system
                                                                .moonsCount
                                                        }
                                                    </span>
                                                </div>
                                                <div>
                                                    Asteroid belts:{' '}
                                                    <span className="font-mono">
                                                        {systemOverviewQuery
                                                            .data.system
                                                            .beltsCount ?? 0}
                                                    </span>
                                                </div>
                                                <div>
                                                    NPC stations:{' '}
                                                    <span className="font-mono">
                                                        {systemOverviewQuery
                                                            .data.system
                                                            .npcStationsCount ??
                                                            0}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Activity (last hour / 24h) */}
                                        <div className="bg-muted/40 space-y-1 rounded-md p-2">
                                            <div className="font-medium">
                                                Activity (last hour)
                                            </div>
                                            <div>
                                                Jumps:{' '}
                                                <span className="font-mono">
                                                    {systemOverviewQuery.data
                                                        .activity.jumps ?? '0'}
                                                </span>
                                            </div>
                                            <div>
                                                NPC Kills:{' '}
                                                <span className="font-mono">
                                                    {systemOverviewQuery.data
                                                        .activity.npcKills ??
                                                        '0'}
                                                </span>
                                            </div>
                                            <div>
                                                Ship Kills:{' '}
                                                <span className="font-mono">
                                                    {systemOverviewQuery.data
                                                        .activity.shipKills ??
                                                        '0'}
                                                </span>
                                            </div>
                                            <div>
                                                Pod Kills:{' '}
                                                <span className="font-mono">
                                                    {systemOverviewQuery.data
                                                        .activity.podKills ??
                                                        '0'}
                                                </span>
                                            </div>

                                            {systemOverviewQuery.data.activity
                                                .last24h && (
                                                <div className="mt-3 space-y-1">
                                                    <div className="font-medium">
                                                        Activity (last 24h)
                                                    </div>
                                                    <div>
                                                        Jumps:{' '}
                                                        <span className="font-mono">
                                                            {
                                                                systemOverviewQuery
                                                                    .data
                                                                    .activity
                                                                    .last24h!
                                                                    .jumps
                                                            }
                                                        </span>
                                                    </div>
                                                    <div>
                                                        NPC Kills:{' '}
                                                        <span className="font-mono">
                                                            {
                                                                systemOverviewQuery
                                                                    .data
                                                                    .activity
                                                                    .last24h!
                                                                    .npcKills
                                                            }
                                                        </span>
                                                    </div>
                                                    <div>
                                                        Ship Kills:{' '}
                                                        <span className="font-mono">
                                                            {
                                                                systemOverviewQuery
                                                                    .data
                                                                    .activity
                                                                    .last24h!
                                                                    .shipKills
                                                            }
                                                        </span>
                                                    </div>
                                                    <div>
                                                        Pod Kills:{' '}
                                                        <span className="font-mono">
                                                            {
                                                                systemOverviewQuery
                                                                    .data
                                                                    .activity
                                                                    .last24h!
                                                                    .podKills
                                                            }
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Activity (48h) – Kills */}
                                        {chartData.length > 1 && (
                                            <div className="mt-2 p-2 md:col-span-2">
                                                <div className="mb-1 font-medium">
                                                    Activity (last 48h): Kills
                                                </div>
                                                <ChartContainer
                                                    className="h-40 w-full"
                                                    config={chartConfig}
                                                >
                                                    <LineChart
                                                        accessibilityLayer
                                                        data={chartData}
                                                        margin={{
                                                            top: 8,
                                                            bottom: 4,
                                                        }}
                                                    >
                                                        <CartesianGrid
                                                            vertical={false}
                                                        />
                                                        <YAxis
                                                            orientation="right"
                                                            width={36}
                                                            tickLine={false}
                                                            axisLine={false}
                                                            tickMargin={6}
                                                            tickFormatter={
                                                                formatYAxisTick
                                                            }
                                                            allowDecimals={
                                                                false
                                                            }
                                                            tickCount={5}
                                                        />
                                                        <XAxis
                                                            dataKey="hour"
                                                            tickLine={false}
                                                            axisLine={false}
                                                            tickMargin={8}
                                                            tickFormatter={
                                                                formatXAxisTick
                                                            }
                                                        />
                                                        <ChartTooltip
                                                            cursor={false}
                                                            content={
                                                                <ChartTooltipContent
                                                                    labelFormatter={
                                                                        formatTooltipLabel
                                                                    }
                                                                />
                                                            }
                                                        />
                                                        <Line
                                                            dataKey="npcKills"
                                                            stroke="var(--color-npcKills)"
                                                            strokeWidth={1}
                                                            dot={false}
                                                            style={{
                                                                opacity: 0.6,
                                                            }}
                                                        />
                                                        <Line
                                                            dataKey="shipKills"
                                                            stroke="var(--color-shipKills)"
                                                            strokeWidth={2}
                                                            dot={false}
                                                        />
                                                        <Line
                                                            dataKey="podKills"
                                                            stroke="var(--color-podKills)"
                                                            strokeWidth={1}
                                                            dot={false}
                                                            style={{
                                                                opacity: 0.6,
                                                            }}
                                                        />
                                                    </LineChart>
                                                </ChartContainer>
                                            </div>
                                        )}

                                        {/* Activity (48h) – Jumps */}
                                        {chartData.length > 1 && (
                                            <div className="mt-2 p-2 md:col-span-2">
                                                <div className="mb-1 font-medium">
                                                    Activity (last 48h): Jumps
                                                </div>
                                                <ChartContainer
                                                    className="h-40 w-full"
                                                    config={chartConfig}
                                                >
                                                    <LineChart
                                                        accessibilityLayer
                                                        data={chartData}
                                                        margin={{
                                                            top: 8,
                                                            bottom: 4,
                                                        }}
                                                    >
                                                        <CartesianGrid
                                                            vertical={false}
                                                        />
                                                        <YAxis
                                                            orientation="right"
                                                            width={36}
                                                            tickLine={false}
                                                            axisLine={false}
                                                            tickMargin={6}
                                                            tickFormatter={
                                                                formatYAxisTick
                                                            }
                                                            allowDecimals={
                                                                false
                                                            }
                                                            tickCount={5}
                                                        />
                                                        <XAxis
                                                            dataKey="hour"
                                                            tickLine={false}
                                                            axisLine={false}
                                                            tickMargin={8}
                                                            tickFormatter={
                                                                formatXAxisTick
                                                            }
                                                        />
                                                        <ChartTooltip
                                                            cursor={false}
                                                            content={
                                                                <ChartTooltipContent
                                                                    labelFormatter={
                                                                        formatTooltipLabel
                                                                    }
                                                                />
                                                            }
                                                        />
                                                        <Line
                                                            dataKey="jumps"
                                                            stroke="var(--color-jumps)"
                                                            strokeWidth={1.5}
                                                            dot={false}
                                                            style={{
                                                                opacity: 0.8,
                                                            }}
                                                        />
                                                    </LineChart>
                                                </ChartContainer>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* TODO: Insert Killfeed here */}
                            </div>
                        ) : (
                            <div>
                                <p className="text-muted-foreground">
                                    Click a system in the canvas to show its
                                    details here.
                                </p>
                                <ul>
                                    <li>
                                        Black/white: connection within the same
                                        constellation
                                    </li>
                                    <li>
                                        Red: connection to a system in another
                                        constellation
                                    </li>
                                    <li>
                                        Purple: connection to a system in
                                        another region
                                    </li>
                                </ul>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
