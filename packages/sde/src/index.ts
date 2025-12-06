/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

import {
    runInstall,
    runImport,
    runCalculate,
    runDownload,
    runUpdate,
    type SdeGlobalOptions,
    type InstallerCommand,
} from './installer'
import { logger } from './lib/logger'
import { invalidateSdeCaches } from './cache/cache'
import { exportLayouts, importLayouts } from './layouts/layoutSeed'

export type { SdeGlobalOptions, InstallerCommand }

/**
 * Installs SDE from scratch:
 * - Download (ensureLatestSdeOnDisk)
 * - Import (all Datasets)
 * - Calculations (all Tasks)
 * - Redis-Cache invalidation
 */
export async function installAllStaticData(
    options: SdeGlobalOptions = {},
): Promise<void> {
    logger.info('🚀 installAllStaticData()')
    await runInstall(options)
}

/**
 * Version-aware Update:
 * - get the actual version from SDE (ensureLatestSdeOnDisk)
 * - import changed datasets (if any)
 * - rerun calculations if necessary
 */
export async function updateStaticData(
    options: SdeGlobalOptions = {},
): Promise<void> {
    logger.info('🚀 updateStaticData()')
    await runUpdate(options)
}

/**
 * Only import:
 * - Version-aware (or with`force`)
 * - Allows partial import via `options.datasets`
 */
export async function importCcpSde(
    options: SdeGlobalOptions = {},
): Promise<void> {
    logger.info('🚀 importCcpSde()')
    await runImport(options)
}

/**
 * Only calculations:
 * - Version-aware (or with`force`)
 * - Runs all calculations (no separate task subcommand)
 */
export async function calculateStaticData(
    options: SdeGlobalOptions = {},
): Promise<void> {
    logger.info('🚀 calculateStaticData()')
    await runCalculate(undefined, options)
}

/**
 * Download:
 * - Ensure latest .sde files on disk
 */
export async function downloadStaticData(
    options: SdeGlobalOptions = {},
): Promise<void> {
    logger.info('🚀 downloadStaticData()')
    await runDownload(options)
}

/**
 * Export map layouts to static files from the database.
 */
export async function exportMapLayouts(): Promise<void> {
    logger.info('🚀 exportMapLayouts()')
    await exportLayouts()
}

/**
 * Import map layouts from static files to the database.
 */
export async function importMapLayouts() {
    logger.info('🚀 importMapLayouts()')
    await importLayouts()
}

/**
 * Only cache invalidation.
 */
export { invalidateSdeCaches }
