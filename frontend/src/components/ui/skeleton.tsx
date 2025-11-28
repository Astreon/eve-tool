/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

import { cn } from '@/lib/utils'
import { ComponentProps } from 'react'

function Skeleton({ className, ...props }: ComponentProps<'div'>) {
    return (
        <div
            data-slot="skeleton"
            className={cn('bg-accent animate-pulse rounded-md', className)}
            {...props}
        />
    )
}

export { Skeleton }
