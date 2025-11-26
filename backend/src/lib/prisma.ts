/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

import { PrismaClient, Prisma } from '../generated/client.js'
import config from '../config/config.js'
import { logger } from './logger.js'

const logConfig: Prisma.LogDefinition[] = [
    { level: 'error', emit: 'event' },
    { level: 'warn', emit: 'event' },
]

// In dev add queries additional
if (config.nodeEnv === 'development') {
    logConfig.push({ level: 'query', emit: 'event' })
}

export const prisma = new PrismaClient({
    log: logConfig,
})

// --- Error
prisma.$on('error', (event: Prisma.LogEvent) => {
    logger.error('DB', 'Prisma error', {
        target: event.target,
        message: event.message,
    })
})

// --- Warning
prisma.$on('warn', (event: Prisma.LogEvent) => {
    logger.error('DB', 'Prisma warning', {
        target: event.target,
        message: event.message,
    })
})

// Dev only: Queries
if (config.nodeEnv === 'development') {
    prisma.$on('query', (event: Prisma.QueryEvent) => {
        logger.debug('DB', 'Prisma query', {
            query: event.query,
            params: event.params,
            durationMs: event.duration,
        })
    })
}
