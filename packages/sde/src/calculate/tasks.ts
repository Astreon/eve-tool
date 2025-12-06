/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

import {
    computeRegionLinks,
    computeConstellationLinks,
    computeSystemLinks,
} from '../calculators'

export type CalculationId =
    | 'region-links'
    | 'constellation-links'
    | 'system-links'

export interface CalculationTask {
    id: CalculationId
    label: string
    run: (dryRun?: boolean) => Promise<void>
}

export const CALCULATION_TASKS: CalculationTask[] = [
    {
        id: 'region-links',
        label: 'Region Links',
        run: computeRegionLinks,
    },
    {
        id: 'constellation-links',
        label: 'Constellation Links',
        run: computeConstellationLinks,
    },
    {
        id: 'system-links',
        label: 'System Links',
        run: computeSystemLinks,
    },
]

export const CALCULATION_TASKS_BY_ID: Record<CalculationId, CalculationTask> =
    CALCULATION_TASKS.reduce(
        (acc, task) => {
            acc[task.id] = task
            return acc
        },
        {} as Record<CalculationId, CalculationTask>,
    )
