/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

export type SdeLogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent'

const LEVEL_ORDER: Record<SdeLogLevel, number> = {
    debug: 10,
    info: 20,
    warn: 30,
    error: 40,
    silent: 50,
}

function resolveLevel(): SdeLogLevel {
    const raw = (process.env.SDE_LOG_LEVEL ?? 'info').toLowerCase()

    if (
        raw === 'debug' ||
        raw === 'info' ||
        raw === 'warn' ||
        raw === 'error' ||
        raw === 'silent'
    ) {
        return raw
    }

    return 'info'
}

const CURRENT_LEVEL = resolveLevel()

function shouldLog(level: SdeLogLevel): boolean {
    return LEVEL_ORDER[level] >= LEVEL_ORDER[CURRENT_LEVEL]
}

export const logger = {
    debug(...args: unknown[]): void {
        if (!shouldLog('debug')) return
        console.log(...args)
    },

    info(...args: unknown[]): void {
        if (!shouldLog('info')) return
        console.log(...args)
    },

    warn(...args: unknown[]): void {
        if (!shouldLog('warn')) return
        console.warn(...args)
    },

    error(...args: unknown[]): void {
        if (!shouldLog('error')) return
        console.error(...args)
    },
} as const
