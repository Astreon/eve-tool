/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

import { IMPORT_TASKS } from './tasks/importTasks.js'
import { sdeLogger } from './lib/logger'
import { createProgressBar } from './lib/progress'

export interface ImportResult {
    success: number
    total: number
    errors: number
}

export interface ImporterStats {
    datasetTotal: number
    datasetSuccess: number
    lineTotal: number
    lineSuccess: number
    errorCount: number
}

export async function importer(dryRun = false): Promise<ImporterStats> {
    const stats: ImporterStats = {
        datasetTotal: IMPORT_TASKS.length,
        datasetSuccess: 0,
        lineTotal: 0,
        lineSuccess: 0,
        errorCount: 0,
    }

    const globalProgress = createProgressBar({
        label: 'Datasets',
        total: IMPORT_TASKS.length,
        redrawEvery: 1,
    })

    let index = 0

    for (const task of IMPORT_TASKS) {
        index++
        sdeLogger.info(`📦 Importing ${task.label}…`)
        const start = performance.now()

        try {
            const result = await task.run(dryRun, task.label, task.id)

            stats.datasetSuccess++
            stats.lineTotal += result.total
            stats.lineSuccess += result.success
            stats.errorCount += result.errors

            const duration = ((performance.now() - start) / 1000).toFixed(1)
            sdeLogger.info(
                `✅ Imported ${result.success}/${result.total} ${task.label} in ${duration}s (${result.errors} errors)`,
            )

            globalProgress.tick()
        } catch (err) {
            stats.errorCount++
            const duration = ((performance.now() - start) / 1000).toFixed(1)
            sdeLogger.error(
                `❌ Failed to import ${task.label} after ${duration}s:`,
                (err as Error).message,
            )

            globalProgress.tick()
        }
    }

    globalProgress.done({ clear: true })

    sdeLogger.info(
        `🏁 Imported ${stats.lineSuccess}/${stats.lineTotal} lines in ${stats.datasetSuccess}/${stats.datasetTotal} datasets (${stats.errorCount} total errors)`,
    )

    return stats
}
