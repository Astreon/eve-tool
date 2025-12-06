/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

import { importer } from './importer.js'
import { runCalculations } from './calculator.js'
import {
    IMPORT_TASKS_BY_ID,
    type ImportDatasetId,
} from './tasks/importTasks.js'
import {
    CALCULATION_TASKS_BY_ID,
    type CalculationId,
} from './tasks/calculateTasks.js'
import { assertSdeDirOnThrow } from './config.js'
import { ensureLatestSdeOnDisk } from './remote.js'
import {
    readSdeVersionFromFile,
    getDbVersion,
    upsertDbVersion,
    type SdeVersion,
} from './version.js'
import { invalidateSdeCaches } from './cache.js'
import { sdeLogger } from './lib/logger.js'
import { withMaintenance } from './lib/maintenance'

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

interface ParsedArgs {
    command: InstallerCommand
    subcommand?: string
    options: SdeGlobalOptions
}

// --- Argument Parsing
function parseArgs(argv: string[]): ParsedArgs {
    const positional: string[] = []
    const options: SdeGlobalOptions = {
        dryRun: false,
        force: false,
    }

    for (const arg of argv) {
        if (arg === '--dry-run') {
            options.dryRun = true
            continue
        }

        if (arg === '--force') {
            options.force = true
            continue
        }

        if (arg.startsWith('--datasets=')) {
            const value = arg.slice('--datasets='.length).trim()
            if (value.length) {
                options.datasets = value
                    .split(',')
                    .map((v) => v.trim().toLowerCase())
                    .filter((v) => v.length > 0)
            }
            continue
        }

        if (arg.startsWith('-')) {
            sdeLogger.warn(`⚠️  Unknown option: ${arg}`)
            continue
        }

        positional.push(arg)
    }

    const first = (positional[0] ?? 'help').toLowerCase()
    let command: InstallerCommand = 'help'
    let subcommand: string | undefined = positional[1]

    switch (first) {
        case 'install':
        case 'import':
        case 'calculate':
        case 'update':
        case 'download':
            command = first
            break
        case 'help':
        default:
            command = 'help'
            break
    }

    if (command !== 'calculate') {
        subcommand = undefined
    }

    return { command, subcommand, options }
}

function printHelp() {
    const msg = `
        Usage: sde <command> [options]
        
        Commands:
          install         Force full pipeline (download + import + calculate + cache)
          import          Version-aware import (full or partial via --datasets=...)
          calculate       Version-aware calculations (all or single task)
          update          Version-aware import + calculate on version change
          download        Only ensure .sde files on disk
        
        Options:
          --dry-run       Don't write to DB or Redis, just simulate
          --force         Ignore version match and run anyway
          --datasets=a,b  Only import selected datasets (for "import")
        `
    // eslint-disable-next-line no-console
    console.log(msg)
}

// --- Helpers
function formatVersion(label: string, v: SdeVersion | null): string {
    if (!v) return `${label}: <none>`
    return `${label}: build=${v.buildNumber}, release=${v.releaseDate.toISOString()}`
}

// --- INSTALL – all, force everytime
export async function runInstall(options: SdeGlobalOptions): Promise<void> {
    const { dryRun } = options

    sdeLogger.info('🚀 EVE Tool – SDE INSTALL (force full pipeline)')
    if (dryRun) {
        sdeLogger.info(
            '🧪 DRY-RUN: no download, no DB writes, no Redis invalidation.',
        )
    }

    if (!dryRun) {
        sdeLogger.info('🌐 Ensuring latest SDE is available on disk…')
        await ensureLatestSdeOnDisk()
    } else {
        sdeLogger.info('🌵 Dry-run: skipping download.')
    }

    assertSdeDirOnThrow()

    sdeLogger.info('📄 Reading SDE version from file…')
    const fileVersion = await readSdeVersionFromFile()
    sdeLogger.info(formatVersion('   File version', fileVersion))

    sdeLogger.info('📥 Running full import of ALL datasets (force)…')
    const importStart = performance.now()
    const stats = await importer(dryRun)
    const importDuration = ((performance.now() - importStart) / 1000).toFixed(1)
    sdeLogger.info(
        `📊 Import summary: ${stats.lineSuccess}/${stats.lineTotal} lines across ${stats.datasetSuccess}/${stats.datasetTotal} datasets (${stats.errorCount} errors)`,
    )
    sdeLogger.info(`✅ Import phase finished in ${importDuration}s.`)

    sdeLogger.info('🧮 Running ALL calculations (force)…')
    const calcStart = performance.now()
    const calcStats = await runCalculations(dryRun)
    const calcDuration = ((performance.now() - calcStart) / 1000).toFixed(1)
    sdeLogger.info(
        `📊 Calculations summary: ${calcStats.taskSuccess}/${calcStats.taskTotal} tasks (${calcStats.errorCount} errors)`,
    )
    sdeLogger.info(`✅ Calculation phase finished in ${calcDuration}s.`)

    if (dryRun) {
        sdeLogger.info(
            '🌵 Dry-run: skipping DB version update and Redis invalidation.',
        )
        return
    }

    sdeLogger.info('📝 Updating SDE version in database…')
    await upsertDbVersion(fileVersion)
    sdeLogger.info(
        `✅ Stored SDE version build=${fileVersion.buildNumber} in database.`,
    )

    sdeLogger.info('🧹 Invalidating Redis caches related to SDE/universe…')
    await invalidateSdeCaches()
    sdeLogger.info('✅ Redis caches successfully invalidated.')
}

// --- IMPORT – version-aware
export async function runImport(options: SdeGlobalOptions): Promise<void> {
    const { dryRun, force, datasets } = options

    assertSdeDirOnThrow()

    sdeLogger.info('🚀 EVE Tool – SDE IMPORT (version-aware)')
    if (dryRun) {
        sdeLogger.info('🧪 DRY-RUN: no DB writes, no Redis invalidation.')
    }

    const fileVersion = await readSdeVersionFromFile()
    const dbVersion = await getDbVersion()
    sdeLogger.info(formatVersion('   DB version', dbVersion))
    sdeLogger.info(formatVersion('   File version', fileVersion))

    const versionMatches =
        dbVersion && dbVersion.buildNumber === fileVersion.buildNumber

    if (!datasets || datasets.length === 0) {
        // Full Import
        if (versionMatches && !force) {
            sdeLogger.info(
                '🆗 SDE already up to date and --force not set. Nothing to import.',
            )
            return
        }

        sdeLogger.info(
            force
                ? '⬆️ Running FULL import with --force (ignoring version match)…'
                : '⬆️ Running FULL import because file version differs…',
        )

        const start = performance.now()
        const stats = await importer(dryRun)
        const dur = ((performance.now() - start) / 1000).toFixed(1)

        sdeLogger.info(
            `📊 Import summary: ${stats.lineSuccess}/${stats.lineTotal} lines across ${stats.datasetSuccess}/${stats.datasetTotal} datasets (${stats.errorCount} errors)`,
        )
        sdeLogger.info(`✅ Full import finished in ${dur}s.`)

        if (dryRun) {
            sdeLogger.info(
                '🌵 Dry-run: skipping DB version update and Redis invalidation.',
            )
            return
        }

        sdeLogger.info('📝 Updating SDE version in database…')
        await upsertDbVersion(fileVersion)
        sdeLogger.info(
            `✅ Stored SDE version build=${fileVersion.buildNumber} in database.`,
        )

        sdeLogger.info('🧹 Invalidating Redis caches related to SDE/universe…')
        await invalidateSdeCaches()
        sdeLogger.info('✅ Redis caches successfully invalidated.')
        return
    }

    // --- Partial Import (selected datasets)
    const ids: ImportDatasetId[] = []

    for (const name of datasets) {
        if (name in IMPORT_TASKS_BY_ID) {
            ids.push(name as ImportDatasetId)
        } else {
            sdeLogger.warn(`⚠️  Unknown dataset "${name}" – skipping`)
        }
    }

    if (ids.length === 0) {
        sdeLogger.error('❌ No valid datasets specified for import.')
        process.exitCode = 1
        return
    }

    if (versionMatches && !force) {
        sdeLogger.info(
            '🆗 SDE already up to date and --force not set. Skipping partial import.',
        )
        return
    }

    sdeLogger.info(
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
        sdeLogger.info(`📦 Importing ${task.label}…`)
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
            sdeLogger.info(
                `✅ Imported ${success}/${total} ${task.label} in ${dur}s (${errors} errors)`,
            )
        } catch (err) {
            errorCount++
            const dur = ((performance.now() - dsStart) / 1000).toFixed(1)
            sdeLogger.error(
                `❌ Failed to import ${task.label} after ${dur}s:`,
                (err as Error).message,
            )
        }
    }

    const totalDur = ((performance.now() - start) / 1000).toFixed(1)
    sdeLogger.info(
        `📊 Summary: ${lineSuccess}/${lineTotal} lines across ${datasetSuccess}/${ids.length} datasets in ${totalDur}s (${errorCount} total errors)`,
    )

    if (dryRun) {
        sdeLogger.info(
            '🌵 Dry-run: skipping DB version update and Redis invalidation.',
        )
        return
    }

    sdeLogger.info(
        'ℹ️ Partial import completed. DB SDE version was not changed (only full import updates version).',
    )
    sdeLogger.info('🧹 Invalidating Redis caches related to SDE/universe…')
    await invalidateSdeCaches()
    sdeLogger.info('✅ Redis caches successfully invalidated.')
}

// --- CALCULATE – version-aware
export async function runCalculate(
    subcommand: string | undefined,
    options: SdeGlobalOptions,
): Promise<void> {
    const { dryRun, force } = options

    assertSdeDirOnThrow()

    sdeLogger.info('🚀 EVE Tool – SDE CALCULATE (version-aware)')

    const fileVersion = await readSdeVersionFromFile()
    const dbVersion = await getDbVersion()
    sdeLogger.info(formatVersion('   DB version', dbVersion))
    sdeLogger.info(formatVersion('   File version', fileVersion))

    if (!dbVersion) {
        sdeLogger.info(
            'ℹ️ No SDE version in DB found. Nothing to calculate (run import/update first).',
        )
        return
    }

    const versionMatches = dbVersion.buildNumber === fileVersion.buildNumber

    if (!versionMatches && !force) {
        sdeLogger.warn(
            '⚠️ DB and file SDE versions differ. Run `sde:update` or `sde:install`, or use --force to calculate anyway.',
        )
        return
    }

    if (dryRun) {
        sdeLogger.info(
            '🧪 DRY-RUN: calculations will not write to DB or invalidate Redis.',
        )
    }

    if (!subcommand) {
        const stats = await runCalculations(dryRun)
        sdeLogger.info(
            `📊 Calculations summary: ${stats.taskSuccess}/${stats.taskTotal} tasks (${stats.errorCount} errors)`,
        )
    } else {
        const id = subcommand.toLowerCase() as CalculationId
        if (!(id in CALCULATION_TASKS_BY_ID)) {
            sdeLogger.error(`❌ Unknown calculation "${subcommand}".`)
            process.exitCode = 1
            return
        }

        const stats = await runCalculations(dryRun, [id])
        sdeLogger.info(
            `📊 Calculations summary: ${stats.taskSuccess}/${stats.taskTotal} tasks (${stats.errorCount} errors)`,
        )
    }

    if (dryRun) {
        sdeLogger.info('🌵 Dry-run: skipping Redis invalidation.')
        return
    }

    sdeLogger.info('🧹 Invalidating Redis caches related to SDE/universe…')
    await invalidateSdeCaches()
    sdeLogger.info('✅ Redis caches successfully invalidated.')
}

// --- UPDATE – import and calculate if Version mismatch
export async function runUpdate(options: SdeGlobalOptions): Promise<void> {
    const { dryRun, force } = options

    sdeLogger.info(
        '🚀 EVE Tool – SDE UPDATE (import + calculate on version change)',
    )
    if (dryRun) {
        sdeLogger.info(
            '🧪 DRY-RUN: no download, no DB writes, no Redis invalidation.',
        )
    }

    if (!dryRun) {
        sdeLogger.info('🌐 Ensuring latest SDE is available on disk…')
        await ensureLatestSdeOnDisk()
    } else {
        sdeLogger.info('🌵 Dry-run: skipping download.')
    }

    assertSdeDirOnThrow()

    const fileVersion = await readSdeVersionFromFile()
    const dbVersion = await getDbVersion()
    sdeLogger.info(formatVersion('   DB version', dbVersion))
    sdeLogger.info(formatVersion('   File version', fileVersion))

    const versionMatches =
        dbVersion && dbVersion.buildNumber === fileVersion.buildNumber

    if (versionMatches && !force) {
        sdeLogger.info(
            '🆗 SDE already up to date and --force not set. Nothing to update.',
        )
        return
    }

    const reason = force
        ? 'SDE Update (forced by Administrator) in Progress'
        : 'SDE Update in progress'

    sdeLogger.info(
        force
            ? '⬆️ Running UPDATE pipeline with --force (import + calculate)…'
            : '⬆️ New SDE version detected – running UPDATE pipeline (import + calculate)…',
    )

    if (dryRun) {
        sdeLogger.info(
            '🧪 DRY-RUN: running UPDATE pipeline without maintenance mode.',
        )
        const importStart = performance.now()
        const stats = await importer(true, {
            changedOnly: true,
        })

        const importDur = ((performance.now() - importStart) / 1000).toFixed(1)
        sdeLogger.info(
            `📊 Import summary: ${stats.lineSuccess}/${stats.lineTotal} lines across ${stats.datasetSuccess}/${stats.datasetTotal} datasets (${stats.errorCount} errors)`,
        )
        sdeLogger.info(`✅ Import phase finished in ${importDur}s.`)

        const calcStart = performance.now()
        const calcStats = await runCalculations(true)
        const calcDur = ((performance.now() - calcStart) / 1000).toFixed(1)
        sdeLogger.info(
            `📊 Calculations summary: ${calcStats.taskSuccess}/${calcStats.taskTotal} tasks (${calcStats.errorCount} errors)`,
        )
        sdeLogger.info(`✅ Calculation phase finished in ${calcDur}s.`)
        sdeLogger.info(
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
        sdeLogger.info(
            `📊 Import summary: ${stats.lineSuccess}/${stats.lineTotal} lines across ${stats.datasetSuccess}/${stats.datasetTotal} datasets (${stats.errorCount} errors)`,
        )
        sdeLogger.info(`✅ Import phase finished in ${importDur}s.`)

        // --- Calculations
        const calcStart = performance.now()
        const calcStats = await runCalculations(false)
        const calcDur = ((performance.now() - calcStart) / 1000).toFixed(1)
        sdeLogger.info(
            `📊 Calculations summary: ${calcStats.taskSuccess}/${calcStats.taskTotal} tasks (${calcStats.errorCount} errors)`,
        )
        sdeLogger.info(`✅ Calculation phase finished in ${calcDur}s.`)

        sdeLogger.info('📝 Updating SDE version in database…')
        await upsertDbVersion(fileVersion)
        sdeLogger.info(
            `✅ Stored SDE version build=${fileVersion.buildNumber} in database.`,
        )

        sdeLogger.info('🧹 Invalidating Redis caches related to SDE/universe…')
        await invalidateSdeCaches()
        sdeLogger.info('✅ Redis caches successfully invalidated.')
    })
}

// --- DOWNLOAD – only .sde Files
export async function runDownload(options: SdeGlobalOptions): Promise<void> {
    const { dryRun } = options

    sdeLogger.info('🚀 EVE Tool – SDE DOWNLOAD (.sde only)')
    if (dryRun) {
        sdeLogger.info('🧪 DRY-RUN: skipping download.')
        return
    }

    await ensureLatestSdeOnDisk()
    sdeLogger.info('✅ SDE files are up to date on disk.')
}

// --- Main
;(async () => {
    try {
        const { command, subcommand, options } = parseArgs(
            process.argv.slice(2),
        )

        switch (command) {
            case 'install':
                await runInstall(options)
                return
            case 'import':
                await runImport(options)
                return
            case 'calculate':
                await runCalculate(subcommand, options)
                return
            case 'update':
                await runUpdate(options)
                return
            case 'download':
                await runDownload(options)
                return
            case 'help':
            default:
                printHelp()
                return
        }
    } catch (err) {
        sdeLogger.error(err, '❌ SDE installer failed.')
        process.exitCode = 1
    }
})()
