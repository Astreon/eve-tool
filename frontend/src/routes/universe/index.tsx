/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

import { createFileRoute } from '@tanstack/react-router'
import { UniverseTool } from '@/components/xyflow/universeTool.tsx'
import { seo } from '@/lib/seo.ts'

export const Route = createFileRoute('/universe/')({
    head: () => ({
        meta: seo({
            title: 'Universe',
            description:
                'Interactive EVE Online starmap with links and informations about the whole universe.',
        }),
    }),
    component: UniversePage,
})

function UniversePage() {
    return (
        <div className="space-y-4">
            <div className="mb-4">
                <h1 className="text-2xl font-bold">Universe</h1>
            </div>
            <div className="h-[calc(100vh-var(--header-height)-6rem)]">
                <UniverseTool />
            </div>
        </div>
    )
}
