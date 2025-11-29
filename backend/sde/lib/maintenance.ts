/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

import { sdeRedis } from './redis.js'
import { sdeLogger } from './logger'

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

    await sdeRedis.set(MAINTENANCE_KEY, payload)
    sdeLogger.info('🚧 Maintenance Guard active')

    try {
        return await fn()
    } finally {
        await sdeRedis.del(MAINTENANCE_KEY)
        sdeLogger.info('🚧 Maintenance Guard deactivated')
    }
}
