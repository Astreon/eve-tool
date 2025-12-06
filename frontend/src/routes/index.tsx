/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

import { createFileRoute } from '@tanstack/react-router'
import { seo } from '@/lib/seo.ts'
import { APP_NAME, APP_VERSION } from '@/lib/copyright.ts'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card.tsx'
import { AlertCircleIcon } from 'lucide-react'

export const Route = createFileRoute('/')({
    head: () => ({
        meta: seo({
            title: APP_NAME + ' ' + APP_VERSION,
            description: 'Welcome to EVE Toolkit.',
            useSuffix: false,
        }),
    }),
    component: RouteComponent,
})

function RouteComponent() {
    return (
        <div className="flex h-[90vh] items-center justify-center">
            <div className="max-w-(--breakpoint-sm) space-y-4 lg:space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle className="mb-4 flex items-center gap-3">
                            <svg
                                className="size-6 animate-spin"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                            >
                                <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                ></circle>
                                <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                ></path>
                            </svg>
                            <h1 className="text-xl">EVE Toolkit</h1>
                        </CardTitle>
                        <CardDescription>
                            This would be a multipurpose Toolkitpage for EVE
                            Online. It will contain tools for mapping, data
                            mining, market analysis, and many more.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="border-t pt-4">
                        <div className="text-muted-foreground flex items-center justify-center gap-2 text-sm">
                            <AlertCircleIcon className="size-4 text-orange-400" />
                            This page is currently under construction.
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
