/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

import { IMPORT_TASKS } from './tasks/importTasks.js'

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

    for (const task of IMPORT_TASKS) {
        console.log(`📦 Importing ${task.label}…`)
        const start = performance.now()

        try {
            const result = await task.run(dryRun)

            stats.datasetSuccess++
            stats.lineTotal += result.total
            stats.lineSuccess += result.success
            stats.errorCount += result.errors

            const duration = ((performance.now() - start) / 1000).toFixed(1)
            console.log(
                `✅ Imported ${result.success}/${result.total} ${task.label} in ${duration}s (${result.errors} errors)`,
            )
        } catch (err) {
            stats.errorCount++
            const duration = ((performance.now() - start) / 1000).toFixed(1)
            console.error(
                `❌ Failed to import ${task.label} after ${duration}s:`,
                (err as Error).message,
            )
        }
    }

    return stats
}
