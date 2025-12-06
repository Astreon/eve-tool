/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

import { systemActivity } from './systemActivity'
import type { SystemActivityCollectorOptions } from './systemActivity'

export type CollectorOptions = SystemActivityCollectorOptions

export type CollectorJobId = 'systemActivity'

export type CollectorJobFn = (options: CollectorOptions) => Promise<void>

export const COLLECTOR_JOBS: Record<CollectorJobId, CollectorJobFn> = {
    systemActivity,
}
