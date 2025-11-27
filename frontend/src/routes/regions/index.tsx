/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

import {createFileRoute} from '@tanstack/react-router'
import {RegionMap} from "@/components/xyflow/region-map.tsx";

export const Route = createFileRoute('/regions/')({
    component: RouteComponent,
})

function RouteComponent() {
    return (
        <div className="space-y-4">
            <div className="mb-4">
                <h1 className="text-2xl font-bold">Regions</h1>
            </div>
            <div className="h-[calc(100vh-var(--header-height)-6rem)] rounded-md border">
                <RegionMap />
            </div>
        </div>
    )
}
