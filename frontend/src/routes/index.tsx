/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

import { createFileRoute } from '@tanstack/react-router'
import { seo } from '@/lib/seo.ts'
import { APP_NAME, APP_VERSION } from '@/lib/copyright.ts'

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
    return <div>Hello World "/"!</div>
}
