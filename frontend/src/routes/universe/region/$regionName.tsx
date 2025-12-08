/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { UniverseTool } from '@/components/xyflow/universeTool.tsx'
import { API_BASE } from '@/lib/env'
import { seo } from '@/lib/seo.ts'

type UniverseSearchItem = {
    id: number
    name?: string
}

async function fetchRegionByName(
    name: string,
): Promise<UniverseSearchItem | null> {
    const res = await fetch(
        `${API_BASE}/universe/search?query=${encodeURIComponent(name)}`,
    )

    if (!res.ok) {
        throw new Error(`Universe search failed with status ${res.status}`)
    }

    const body = await res.json()
    const regions = (body?.data?.regions ?? []) as UniverseSearchItem[]
    const lower = name.toLowerCase()

    return (
        regions.find((r) => r.name?.toLowerCase() === lower) ??
        regions[0] ??
        null
    )
}

export const Route = createFileRoute('/universe/region/$regionName')({
    head: ({ params }) => {
        const decoded = decodeURIComponent(params.regionName)
        return {
            meta: seo({
                title: `${decoded} - Universe`,
                description: `Interactive map view for the EVE Online region ${decoded}.`,
            }),
        }
    },
    component: UniverseRegionPage,
})

function UniverseRegionPage() {
    const { regionName } = Route.useParams()
    const decodedName = decodeURIComponent(regionName)

    const regionQuery = useQuery({
        queryKey: ['universe-region-by-name', decodedName],
        queryFn: () => fetchRegionByName(decodedName),
        staleTime: 10 * 60_000,
    })

    if (regionQuery.isLoading) {
        return (
            <div className="space-y-4">
                <div className="mb-4">
                    <h1 className="text-2xl font-bold">
                        Universe – {decodedName}
                    </h1>
                    <p className="text-muted-foreground">Loading region…</p>
                </div>
                <div className="border-border h-[60vh] rounded-lg border" />
            </div>
        )
    }

    if (!regionQuery.data) {
        return (
            <div className="space-y-4">
                <div className="mb-4">
                    <h1 className="text-2xl font-bold">
                        Universe – Region not found
                    </h1>
                    <p className="text-muted-foreground">
                        Could not resolve region “{decodedName}”.
                    </p>
                </div>
            </div>
        )
    }

    const region = regionQuery.data

    return (
        <div className="space-y-4">
            <div className="mb-4">
                <h1 className="text-2xl font-bold">Universe – {region.name}</h1>
            </div>
            <div className="min-h-[calc(100vh-var(--header-height)-6rem)] lg:h-[calc(100vh-var(--header-height)-6rem)]">
                <UniverseTool initialRegionId={region.id} />
            </div>
        </div>
    )
}
