/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

import { sdeRedis } from './lib/redis.js'
import { sdeLogger } from './lib/logger'

const REGION_CACHE_PREFIX = 'regions'
const CACHE_VERSION = process.env.CACHE_VERSION

export async function invalidateSdeCaches() {
    const patterns = [`${REGION_CACHE_PREFIX}:${CACHE_VERSION}:*`]

    for (const pattern of patterns) {
        try {
            const keys = await sdeRedis.keys(pattern)
            if (keys.length > 0) {
                await sdeRedis.del(...keys)
                sdeLogger.info(
                    `[SDE] Cleared ${keys.length} Redis keys for pattern "${pattern}"`,
                )
            } else {
                sdeLogger.info(
                    `[SDE] No Redis keys matched pattern "${pattern}"`,
                )
            }
        } catch (err) {
            sdeLogger.error(
                `[SDE] Failed to clear Redis keys for pattern "${pattern}":`,
                err,
            )
        }
    }
}
