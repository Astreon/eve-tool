/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

import { redis } from '../lib/redis'
import { logger } from '../lib/logger'

const REGION_CACHE_PREFIX = 'regions'
const CACHE_VERSION = process.env.CACHE_VERSION

export async function invalidateSdeCaches() {
    const patterns = [`${REGION_CACHE_PREFIX}:${CACHE_VERSION}:*`]

    for (const pattern of patterns) {
        try {
            const keys = await redis.keys(pattern)
            if (keys.length > 0) {
                await redis.del(...keys)
                logger.info(
                    `[SDE] Cleared ${keys.length} Redis keys for pattern "${pattern}"`,
                )
            } else {
                logger.info(`[SDE] No Redis keys matched pattern "${pattern}"`)
            }
        } catch (err) {
            logger.error(
                `[SDE] Failed to clear Redis keys for pattern "${pattern}":`,
                err,
            )
        }
    }
}
