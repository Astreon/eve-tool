/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

export const APP_NAME = 'EVE Toolkit'
export const APP_COPYRIGHT = '© 2025 Astreon'
export const APP_LICENCE = 'CC-BY-NC-SA-4.0'

const FALLBACK_VERSION = '0.0.0-dev'
const FALLBACK_BUILD = 'local'

export const APP_VERSION = import.meta.env.VITE_APP_VERSION ?? FALLBACK_VERSION
export const APP_BUILD =
    import.meta.env.VITE_APP_BUILD ?? import.meta.env.VERCEL_GIT_COMMIT_SHA ?? FALLBACK_BUILD
