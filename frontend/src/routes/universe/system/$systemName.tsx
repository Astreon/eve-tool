/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

import { createFileRoute, useRouter } from '@tanstack/react-router'
import { seo } from '@/lib/seo.ts'
import { Button } from '@/components/ui/button'
import { ArrowLeftIcon } from 'lucide-react'

export const Route = createFileRoute('/universe/system/$systemName')({
    head: ({ params }) => {
        const decoded = decodeURIComponent(params.systemName)
        return {
            meta: seo({
                title: `${decoded} - Universe`,
                description: `Details and activity for the EVE Online system ${decoded}.`,
            }),
        }
    },
    component: SystemPage,
})

function SystemPage() {
    const router = useRouter()
    const { systemName } = Route.useParams()
    const decodedName = decodeURIComponent(systemName)

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                    <h1 className="text-2xl font-bold">{decodedName}</h1>
                    <p className="text-muted-foreground">
                        Dedicated system view coming soon. For now, use the
                        region map to explore activity and topology.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.navigate({ to: '/universe' })}
                    >
                        <ArrowLeftIcon className="mr-2 h-4 w-4" />
                        Back to universe
                    </Button>
                </div>
            </div>
        </div>
    )
}
