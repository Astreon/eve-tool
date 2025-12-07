/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

import {
    ensureLatestSdeOnDisk,
    readSdeVersionFromFile,
    getDbVersion,
    upsertDbVersion,
    type SdeVersion,
} from './download'
import {
    runCalculations,
    CALCULATION_TASKS_BY_ID,
    type CalculationId,
} from './calculate'
import { importer, IMPORT_TASKS_BY_ID, type ImportDatasetId } from './import'
import { logger } from './lib/logger.js'
import { assertSdeDirOnThrow } from './config.js'
import { invalidateSdeCaches } from './cache/cache.js'
import { withMaintenance } from './lib/maintenance.js'

export type InstallerCommand =
    | 'install'
    | 'import'
    | 'calculate'
    | 'update'
    | 'download'
    | 'help'

export interface SdeGlobalOptions {
    dryRun?: boolean
    force?: boolean
    datasets?: string[]
}

// --- Helpers
function formatVersion(label: string, v: SdeVersion | null): string {
    if (!v) return `${label}: <none>`
    return `${label}: build=${v.buildNumber}, release=${v.releaseDate.toISOString()}`
}

// --- INSTALL – all, force everytime
export async function runInstall(options: SdeGlobalOptions): Promise<void> {
    const { dryRun } = options

    logger.info('🚀 EVE Tool – SDE INSTALL (force full pipeline)')
    if (dryRun) {
        logger.info(
            '🧪 DRY-RUN: no download, no DB writes, no Redis invalidation.',
        )
    }

    if (!dryRun) {
        logger.info('🌐 Ensuring latest SDE is available on disk…')
        await ensureLatestSdeOnDisk()
    } else {
        logger.info('🌵 Dry-run: skipping download.')
    }

    assertSdeDirOnThrow()

    logger.info('📄 Reading SDE version from file…')
    const fileVersion = await readSdeVersionFromFile()
    logger.info(formatVersion('   File version', fileVersion))

    logger.info('📥 Running full import of ALL datasets (force)…')
    const importStart = performance.now()
    const stats = await importer(dryRun)
    const importDuration = ((performance.now() - importStart) / 1000).toFixed(1)
    logger.info(
        `📊 Import summary: ${stats.lineSuccess}/${stats.lineTotal} lines across ${stats.datasetSuccess}/${stats.datasetTotal} datasets (${stats.errorCount} errors)`,
    )
    logger.info(`✅ Import phase finished in ${importDuration}s.`)

    logger.info('🧮 Running ALL calculations (force)…')
    const calcStart = performance.now()
    const calcStats = await runCalculations(dryRun)
    const calcDuration = ((performance.now() - calcStart) / 1000).toFixed(1)
    logger.info(
        `📊 Calculations summary: ${calcStats.taskSuccess}/${calcStats.taskTotal} tasks (${calcStats.errorCount} errors)`,
    )
    logger.info(`✅ Calculation phase finished in ${calcDuration}s.`)

    if (dryRun) {
        logger.info(
            '🌵 Dry-run: skipping DB version update and Redis invalidation.',
        )
        return
    }

    logger.info('📝 Updating SDE version in database…')
    await upsertDbVersion(fileVersion)
    logger.info(
        `✅ Stored SDE version build=${fileVersion.buildNumber} in database.`,
    )

    logger.info('🧹 Invalidating Redis caches related to SDE/universe…')
    await invalidateSdeCaches()
    logger.info('✅ Redis caches successfully invalidated.')
}

// --- IMPORT – version-aware
export async function runImport(options: SdeGlobalOptions): Promise<void> {
    const { dryRun, force, datasets } = options

    assertSdeDirOnThrow()

    logger.info('🚀 EVE Tool – SDE IMPORT (version-aware)')
    if (dryRun) {
        logger.info('🧪 DRY-RUN: no DB writes, no Redis invalidation.')
    }

    const fileVersion = await readSdeVersionFromFile()
    const dbVersion = await getDbVersion()
    logger.info(formatVersion('   DB version', dbVersion))
    logger.info(formatVersion('   File version', fileVersion))

    const versionMatches =
        dbVersion && dbVersion.buildNumber === fileVersion.buildNumber

    if (!datasets || datasets.length === 0) {
        // Full Import
        if (versionMatches && !force) {
            logger.info(
                '🆗 SDE already up to date and --force not set. Nothing to import.',
            )
            return
        }

        logger.info(
            force
                ? '⬆️ Running FULL import with --force (ignoring version match)…'
                : '⬆️ Running FULL import because file version differs…',
        )

        const start = performance.now()
        const stats = await importer(dryRun)
        const dur = ((performance.now() - start) / 1000).toFixed(1)

        logger.info(
            `📊 Import summary: ${stats.lineSuccess}/${stats.lineTotal} lines across ${stats.datasetSuccess}/${stats.datasetTotal} datasets (${stats.errorCount} errors)`,
        )
        logger.info(`✅ Full import finished in ${dur}s.`)

        if (dryRun) {
            logger.info(
                '🌵 Dry-run: skipping DB version update and Redis invalidation.',
            )
            return
        }

        logger.info('📝 Updating SDE version in database…')
        await upsertDbVersion(fileVersion)
        logger.info(
            `✅ Stored SDE version build=${fileVersion.buildNumber} in database.`,
        )

        logger.info('🧹 Invalidating Redis caches related to SDE/universe…')
        await invalidateSdeCaches()
        logger.info('✅ Redis caches successfully invalidated.')
        return
    }

    // --- Partial Import (selected datasets)
    const ids: ImportDatasetId[] = []

    for (const name of datasets) {
        if (name in IMPORT_TASKS_BY_ID) {
            ids.push(name as ImportDatasetId)
        } else {
            logger.warn(`⚠️  Unknown dataset "${name}" – skipping`)
        }
    }

    if (ids.length === 0) {
        logger.error('❌ No valid datasets specified for import.')
        process.exitCode = 1
        return
    }

    if (versionMatches && !force) {
        logger.info(
            '🆗 SDE already up to date and --force not set. Skipping partial import.',
        )
        return
    }

    logger.info(
        `⬆️ Running PARTIAL import for datasets: ${ids.join(', ')}${
            force ? ' (forced)' : ''
        }`,
    )

    const start = performance.now()
    let datasetSuccess = 0
    let lineTotal = 0
    let lineSuccess = 0
    let errorCount = 0

    for (const id of ids) {
        const task = IMPORT_TASKS_BY_ID[id]
        logger.info(`📦 Importing ${task.label}…`)
        const dsStart = performance.now()

        try {
            const { success, total, errors } = await task.run(
                dryRun ?? false,
                task.label,
            )
            datasetSuccess++
            lineTotal += total
            lineSuccess += success
            errorCount += errors

            const dur = ((performance.now() - dsStart) / 1000).toFixed(1)
            logger.info(
                `✅ Imported ${success}/${total} ${task.label} in ${dur}s (${errors} errors)`,
            )
        } catch (err) {
            errorCount++
            const dur = ((performance.now() - dsStart) / 1000).toFixed(1)
            logger.error(
                {
                    error: err instanceof Error ? err.message : String(err),
                },
                `❌ Failed to import ${task.label} after ${dur}s:`,
            )
        }
    }

    const totalDur = ((performance.now() - start) / 1000).toFixed(1)
    logger.info(
        `📊 Summary: ${lineSuccess}/${lineTotal} lines across ${datasetSuccess}/${ids.length} datasets in ${totalDur}s (${errorCount} total errors)`,
    )

    if (dryRun) {
        logger.info(
            '🌵 Dry-run: skipping DB version update and Redis invalidation.',
        )
        return
    }

    logger.info(
        'ℹ️ Partial import completed. DB SDE version was not changed (only full import updates version).',
    )
    logger.info('🧹 Invalidating Redis caches related to SDE/universe…')
    await invalidateSdeCaches()
    logger.info('✅ Redis caches successfully invalidated.')
}

// --- CALCULATE – version-aware
export async function runCalculate(
    subcommand: string | undefined,
    options: SdeGlobalOptions,
): Promise<void> {
    const { dryRun, force } = options

    assertSdeDirOnThrow()

    logger.info('🚀 EVE Tool – SDE CALCULATE (version-aware)')

    const fileVersion = await readSdeVersionFromFile()
    const dbVersion = await getDbVersion()
    logger.info(formatVersion('   DB version', dbVersion))
    logger.info(formatVersion('   File version', fileVersion))

    if (!dbVersion) {
        logger.info(
            'ℹ️ No SDE version in DB found. Nothing to calculate (run import/update first).',
        )
        return
    }

    const versionMatches = dbVersion.buildNumber === fileVersion.buildNumber

    if (!versionMatches && !force) {
        logger.warn(
            '⚠️ DB and file SDE versions differ. Run `sde:update` or `sde:install`, or use --force to calculate anyway.',
        )
        return
    }

    if (dryRun) {
        logger.info(
            '🧪 DRY-RUN: calculations will not write to DB or invalidate Redis.',
        )
    }

    if (!subcommand) {
        const stats = await runCalculations(dryRun)
        logger.info(
            `📊 Calculations summary: ${stats.taskSuccess}/${stats.taskTotal} tasks (${stats.errorCount} errors)`,
        )
    } else {
        const id = subcommand.toLowerCase() as CalculationId
        if (!(id in CALCULATION_TASKS_BY_ID)) {
            logger.error(`❌ Unknown calculation "${subcommand}".`)
            process.exitCode = 1
            return
        }

        const stats = await runCalculations(dryRun, [id])
        logger.info(
            `📊 Calculations summary: ${stats.taskSuccess}/${stats.taskTotal} tasks (${stats.errorCount} errors)`,
        )
    }

    if (dryRun) {
        logger.info('🌵 Dry-run: skipping Redis invalidation.')
        return
    }

    logger.info('🧹 Invalidating Redis caches related to SDE/universe…')
    await invalidateSdeCaches()
    logger.info('✅ Redis caches successfully invalidated.')
}

// --- UPDATE – import and calculate if Version mismatch
export async function runUpdate(options: SdeGlobalOptions): Promise<void> {
    const { dryRun, force } = options

    logger.info(
        '🚀 EVE Tool – SDE UPDATE (import + calculate on version change)',
    )
    if (dryRun) {
        logger.info(
            '🧪 DRY-RUN: no download, no DB writes, no Redis invalidation.',
        )
    }

    if (!dryRun) {
        logger.info('🌐 Ensuring latest SDE is available on disk…')
        await ensureLatestSdeOnDisk()
    } else {
        logger.info('🌵 Dry-run: skipping download.')
    }

    assertSdeDirOnThrow()

    const fileVersion = await readSdeVersionFromFile()
    const dbVersion = await getDbVersion()
    logger.info(formatVersion('   DB version', dbVersion))
    logger.info(formatVersion('   File version', fileVersion))

    const versionMatches =
        dbVersion && dbVersion.buildNumber === fileVersion.buildNumber

    if (versionMatches && !force) {
        logger.info(
            '🆗 SDE already up to date and --force not set. Nothing to update.',
        )
        return
    }

    const reason = force
        ? 'SDE Update (forced by Administrator) in Progress'
        : 'SDE Update in progress'

    logger.info(
        force
            ? '⬆️ Running UPDATE pipeline with --force (import + calculate)…'
            : '⬆️ New SDE version detected – running UPDATE pipeline (import + calculate)…',
    )

    if (dryRun) {
        logger.info(
            '🧪 DRY-RUN: running UPDATE pipeline without maintenance mode.',
        )
        const importStart = performance.now()
        const stats = await importer(true, {
            changedOnly: true,
        })

        const importDur = ((performance.now() - importStart) / 1000).toFixed(1)
        logger.info(
            `📊 Import summary: ${stats.lineSuccess}/${stats.lineTotal} lines across ${stats.datasetSuccess}/${stats.datasetTotal} datasets (${stats.errorCount} errors)`,
        )
        logger.info(`✅ Import phase finished in ${importDur}s.`)

        const calcStart = performance.now()
        const calcStats = await runCalculations(true)
        const calcDur = ((performance.now() - calcStart) / 1000).toFixed(1)
        logger.info(
            `📊 Calculations summary: ${calcStats.taskSuccess}/${calcStats.taskTotal} tasks (${calcStats.errorCount} errors)`,
        )
        logger.info(`✅ Calculation phase finished in ${calcDur}s.`)
        logger.info(
            '🌵 Dry-run: skipping DB version update and Redis invalidation.',
        )

        return
    }

    await withMaintenance(reason, async () => {
        // Import
        const importStart = performance.now()
        const stats = await importer(false, {
            changedOnly: true,
        })

        const importDur = ((performance.now() - importStart) / 1000).toFixed(1)
        logger.info(
            `📊 Import summary: ${stats.lineSuccess}/${stats.lineTotal} lines across ${stats.datasetSuccess}/${stats.datasetTotal} datasets (${stats.errorCount} errors)`,
        )
        logger.info(`✅ Import phase finished in ${importDur}s.`)

        // --- Calculations
        const calcStart = performance.now()
        const calcStats = await runCalculations(false)
        const calcDur = ((performance.now() - calcStart) / 1000).toFixed(1)
        logger.info(
            `📊 Calculations summary: ${calcStats.taskSuccess}/${calcStats.taskTotal} tasks (${calcStats.errorCount} errors)`,
        )
        logger.info(`✅ Calculation phase finished in ${calcDur}s.`)

        logger.info('📝 Updating SDE version in database…')
        await upsertDbVersion(fileVersion)
        logger.info(
            `✅ Stored SDE version build=${fileVersion.buildNumber} in database.`,
        )

        logger.info('🧹 Invalidating Redis caches related to SDE/universe…')
        await invalidateSdeCaches()
        logger.info('✅ Redis caches successfully invalidated.')
    })
}

// --- DOWNLOAD – only .sde Files
export async function runDownload(options: SdeGlobalOptions): Promise<void> {
    const { dryRun } = options

    logger.info('🚀 EVE Tool – SDE DOWNLOAD (.sde only)')
    if (dryRun) {
        logger.info('🧪 DRY-RUN: skipping download.')
        return
    }

    await ensureLatestSdeOnDisk()
    logger.info('✅ SDE files are up to date on disk.')
}
