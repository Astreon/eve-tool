/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

import { APP_NAME } from '@/lib/copyright.ts'

type MetaDescriptor = {
    [key: string]: string | undefined
}

type SeoOptions = {
    title?: string
    description?: string
    useSuffix?: boolean
}

export function seo(options: SeoOptions = {}): MetaDescriptor[] {
    const { title, description, useSuffix = true } = options

    let finalTitle: string

    if (!title) {
        finalTitle = APP_NAME
    } else if (useSuffix) {
        finalTitle = `${title} - ${APP_NAME}`
    } else {
        finalTitle = title
    }

    const tags: MetaDescriptor[] = [{ title: finalTitle }]

    if (description) {
        tags.push({
            name: 'description',
            content: description,
        })
    }

    return tags
}
