/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

import { redis } from './redis.js'
import { logger } from './logger.js'

const MAINTENANCE_KEY = 'runtime:maintenance'

export async function withMaintenance<T>(
    reason: string,
    fn: () => Promise<T>,
): Promise<T> {
    const payload = JSON.stringify({
        reason,
        startedAt: new Date().toISOString(),
        source: 'sde',
    })

    await redis.set(MAINTENANCE_KEY, payload)
    logger.info('🚧 Maintenance Guard active')

    try {
        return await fn()
    } finally {
        await redis.del(MAINTENANCE_KEY)
        logger.info('🚧 Maintenance Guard deactivated')
    }
}
