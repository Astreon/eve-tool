/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

import { recomputeRegionLinks } from "../calculators/computeRegionLinks.js";

export type CalculationId = "region-links";

export interface CalculationTask {
    id: CalculationId;
    label: string;
    run: (dryRun?: boolean) => Promise<void>;
}

export const CALCULATION_TASKS: CalculationTask[] = [
    {
        id: "region-links",
        label: "Region Links",
        async run(dryRun?: boolean) {
            if (dryRun) {
                console.log("🧪 Dry-run: would recompute region links.");
                return;
            }

            await recomputeRegionLinks();
        },
    },
];

export const CALCULATION_TASKS_BY_ID: Record<CalculationId, CalculationTask> =
    CALCULATION_TASKS.reduce(
        (acc, task) => {
            acc[task.id] = task;
            return acc;
        },
        {} as Record<CalculationId, CalculationTask>,
    );
