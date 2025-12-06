/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

import {
    CALCULATION_TASKS,
    CALCULATION_TASKS_BY_ID,
    type CalculationId,
} from './tasks/calculateTasks.js'
import { sdeLogger } from './lib/logger.js'
import { createProgressBar } from './lib/progress'

export interface CalculationStats {
    taskTotal: number
    taskSuccess: number
    errorCount: number
}

export async function runCalculations(
    dryRun = false,
    ids?: CalculationId[],
): Promise<CalculationStats> {
    const tasks = ids
        ? ids.map((id) => CALCULATION_TASKS_BY_ID[id])
        : CALCULATION_TASKS

    const stats: CalculationStats = {
        taskTotal: tasks.length,
        taskSuccess: 0,
        errorCount: 0,
    }

    const isTty = process.stdout.isTTY

    const globalProgress = isTty
        ? createProgressBar({
              label: 'Calculations',
              total: tasks.length,
              redrawEvery: 250,
          })
        : null

    let index = 0

    for (const task of tasks) {
        index++

        sdeLogger.info(
            `🧮 (${index}/${tasks.length}) Running calculation: ${task.label}`,
        )

        const start = performance.now()

        try {
            await task.run(dryRun)

            stats.taskSuccess++

            const duration = ((performance.now() - start) / 1000).toFixed(1)
            sdeLogger.info(
                dryRun
                    ? `✅ Dry-run completed for ${task.label} in ${duration}s`
                    : `✅ Finished ${task.label} in ${duration}s`,
            )

            if (globalProgress) {
                globalProgress.tick(1)
            }
        } catch (err) {
            stats.errorCount++

            const duration = ((performance.now() - start) / 1000).toFixed(1)
            sdeLogger.error(
                `❌ Failed to run ${task.label} after ${duration}s:`,
                (err as Error).message,
            )

            if (globalProgress) {
                globalProgress.tick(1)
            }
        }
    }

    if (globalProgress) {
        globalProgress.done({ clear: true })
    }

    sdeLogger.info(
        `🏁 Completed ${stats.taskSuccess}/${stats.taskTotal} calculation tasks (${stats.errorCount} total errors)`,
    )

    return stats
}

if (process.argv[1]?.endsWith('calculator.ts')) {
    runCalculations()
        .then(() => process.exit(0))
        .catch((err) => {
            sdeLogger.error(err, '❌ SDE calculations failed')
            process.exit(1)
        })
}
