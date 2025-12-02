/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

import { createFileRoute } from '@tanstack/react-router'
import { MapTool } from '@/components/xyflow/mapTool.tsx'
import { seo } from '@/lib/seo.ts'

export const Route = createFileRoute('/universe/')({
    head: () => ({
        meta: seo({
            title: 'Map Tool',
            description:
                'Interactive EVE Online starmap with links and informations about the whole universe.',
        }),
    }),
    component: MapToolPage,
})

function MapToolPage() {
    return (
        <div className="space-y-4">
            <div className="mb-4">
                <h1 className="text-2xl font-bold">Map Tool</h1>
            </div>
            <div className="h-[calc(100vh-var(--header-height)-6rem)]">
                <MapTool />
            </div>
        </div>
    )
}
