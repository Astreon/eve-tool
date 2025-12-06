/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

import { sdeLogger } from './lib/logger.js'
import {
    runInstall,
    runImport,
    runCalculate,
    runDownload,
    runUpdate,
    type SdeGlobalOptions,
    type InstallerCommand,
} from './installer.js'
import { exportLayouts, importLayouts } from './layoutSeed.js'
import { invalidateSdeCaches } from './cache.js'

export type { InstallerCommand, SdeGlobalOptions } from './installer.js'

/**
 * Installs SDE from scratch:
 * - Download
 * - Import all Datasets
 * - Calculations
 * - Cache-Invalidation
 */
export async function installAllStaticData(options: SdeGlobalOptions = {}) {
    sdeLogger.info(
        '🚀 installAllStaticData() – full SDE install via runInstall()',
    )
    await runDownload(options)
    await runInstall(options)
}

/**
 * Version-aware Update:
 * - check version
 * - import changed datasets (if any)
 * - rerun calculations if necessary
 * - invalidate Caches
 */
export async function updateStaticData(options: SdeGlobalOptions = {}) {
    sdeLogger.info('⬆️ updateStaticData() – delegating to runUpdate()')
    await runUpdate(options)
}

/**
 * Execute only CCP SDE-Imports (without calculations).
 */
export async function importCcpSde(options: SdeGlobalOptions = {}) {
    sdeLogger.info('📥 importCcpSde() – delegating to runImport()')
    await runImport(options)
}

/**
 * Execute only SDE-Calculations (without importing).
 */
export async function calculateStaticData(options: SdeGlobalOptions = {}) {
    sdeLogger.info('🧮 calculateStaticData() – delegating to runCalculate()')
    await runCalculate(undefined, options)
}

/**
 * Export current map layouts from database to static files.
 */
export async function exportMapLayouts() {
    sdeLogger.info('🗺️ exportMapLayouts()')
    await exportLayouts()
}

/**
 * Import map layouts from static files to the database.
 */
export async function importMapLayouts() {
    sdeLogger.info('🗺️ importMapLayouts()')
    await importLayouts()
}

/**
 * Only cache invalidation.
 */
export { invalidateSdeCaches }
