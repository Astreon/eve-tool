/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

import app from './app.js'
import config from './config/config.js'
import { logger } from './lib/logger.js'
import { prisma } from './lib/prisma.js'
import { redis } from './lib/redis.js'

async function bootstrap() {
    logger.info('APP', 'Starting EVE Tool backend', {
        env: config.nodeEnv,
    })

    // --- Check PostgreSQL connection
    try {
        const startedAt = Date.now()
        await prisma.$connect()
        logger.info('DB', 'Connected to PostgreSQL', {
            durationMs: Date.now() - startedAt,
        })
    } catch (err) {
        logger.error('DB', 'Failed to connect to PostgreSQL on startup', {
            error: err instanceof Error ? err.message : String(err),
        })
    }

    // --- Check Redis connection
    try {
        const startedAt = Date.now()
        const pong = await redis.ping()
        logger.info('REDIS', 'Redis ping successful', {
            reply: pong,
            durationMs: Date.now() - startedAt,
        })
    } catch (err) {
        logger.error('REDIS', 'Failed to ping Redis on startup', {
            error: err instanceof Error ? err.message : String(err),
        })
    }

    // --- Start HTTP server
    app.listen(config.port, () => {
        logger.info('APP', 'Server started', {
            port: config.port,
            env: config.nodeEnv,
        })
    })
}

bootstrap().catch((err) => {
    logger.error('APP', 'Fatal error during bootstrap', {
        error: err instanceof Error ? err.message : String(err),
    })
    process.exit(1)
})
