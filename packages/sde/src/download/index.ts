/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

export { ensureLatestSdeOnDisk } from './remote.js'

export {
    readSdeVersionFromFile,
    getDbVersion,
    upsertDbVersion,
} from './version.js'

export type { SdeVersion } from './version.js'
