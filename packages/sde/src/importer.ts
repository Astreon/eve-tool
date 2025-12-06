/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

import { IMPORT_TASKS } from './tasks/importTasks.js'
import { sdeLogger } from './lib/logger'
import { createProgressBar } from './lib/progress'
import { assertSdeDirOnThrow } from './config'
import {
    DATASET_FILES,
    getDatasetsNeedingImport,
    markDatasetAsImported,
    type DatasetId,
} from './datasetHashes'

export interface ImportResult {
    success: number
    total: number
    errors: number
}

export interface ImporterStats {
    datasetTotal: number
    datasetSuccess: number
    datasetError: number
    lineTotal: number
    lineSuccess: number
    lineError: number
    errorCount: number
}

export interface ImporterOptions {
    only?: DatasetId[]
    changedOnly?: boolean
}

export async function importer(
    dryRun = false,
    options: ImporterOptions = {},
): Promise<ImporterStats> {
    assertSdeDirOnThrow()

    const allTasks = IMPORT_TASKS

    // 1) Choose Datasets to Import
    let selectedIds: DatasetId[] = (
        allTasks.map((t) => t.id) as DatasetId[]
    ).filter((id) => id in DATASET_FILES)

    if (options.only && options.only.length > 0) {
        const onlySet = new Set(options.only)
        selectedIds = selectedIds.filter((id) => onlySet.has(id))
    }

    // 2) Only Datasets, which have changed since last import
    if (options.changedOnly) {
        const changed = await getDatasetsNeedingImport(selectedIds)
        const changedSet = new Set(changed)

        sdeLogger.info(
            `[SDE] Changed-only import active – ${changed.length}/${selectedIds.length} datasets have changed since last import.`,
        )

        selectedIds = selectedIds.filter((id) => changedSet.has(id))

        if (selectedIds.length === 0) {
            sdeLogger.info(
                '[SDE] No Datasets changed since last import. Skipping import.',
            )
            return {
                datasetTotal: 0,
                datasetSuccess: 0,
                datasetError: 0,
                lineTotal: 0,
                lineSuccess: 0,
                lineError: 0,
                errorCount: 0,
            }
        }
    }

    const selectedTasks = allTasks.filter((task) =>
        (selectedIds as string[]).includes(task.id),
    )

    const stats: ImporterStats = {
        datasetTotal: IMPORT_TASKS.length,
        datasetSuccess: 0,
        datasetError: 0,
        lineTotal: 0,
        lineSuccess: 0,
        lineError: 0,
        errorCount: 0,
    }

    const isTty = process.stdout.isTTY

    const globalProgress = isTty
        ? createProgressBar({
              label: 'Datasets',
              total: selectedTasks.length,
              redrawEvery: 250,
          })
        : null

    let index = 0

    for (const task of selectedTasks) {
        index++

        const datasetId = task.id as DatasetId

        if (globalProgress) {
            globalProgress.done({ clear: true })
        }

        sdeLogger.info(
            `📦 (${index}/${selectedTasks.length}) Importing ${task.label})`,
        )

        const datasetProgress = createProgressBar({
            label: `[SDE] ${task.label}`,
        })

        const start = performance.now()

        try {
            const result: ImportResult = await task.run(dryRun, task.label)

            stats.lineTotal += result.total
            stats.lineSuccess += result.success
            stats.lineError += result.errors
            stats.errorCount += result.errors

            if (result.errors === 0) {
                stats.datasetSuccess += 1

                if (!dryRun) {
                    await markDatasetAsImported(datasetId)
                }
            } else {
                stats.datasetError += 1
            }

            const duration = ((performance.now() - start) / 1000).toFixed(1)
            sdeLogger.info(
                `✅ Imported ${result.success}/${result.total} ${task.label} in ${duration}s (${result.errors} errors)`,
            )
        } catch (err) {
            stats.datasetError += 1
            stats.errorCount += 1

            const duration = ((performance.now() - start) / 1000).toFixed(1)
            sdeLogger.error(
                `❌ Failed to import ${task.label} (${datasetId}) after ${duration}s:`,
                (err as Error).message,
            )

            if (globalProgress) {
                globalProgress.tick(1)
            }
        } finally {
            datasetProgress.done({ clear: true })

            if (globalProgress) {
                globalProgress.tick(1)
            }
        }
    }

    if (globalProgress) {
        globalProgress.done({ clear: true })
    }

    sdeLogger.info(
        `🏁 Imported ${stats.lineSuccess}/${stats.lineTotal} lines in ${stats.datasetSuccess}/${stats.datasetTotal} datasets (${stats.errorCount} total errors)`,
    )

    return stats
}
