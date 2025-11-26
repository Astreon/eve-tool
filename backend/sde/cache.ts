/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

import {redis} from "../src/lib/redis.js";
import config from "../src/config/config.js";

const REGION_CACHE_PREFIX = "regions";

export async function invalidateSdeCaches() {
    const v = config.redis.cacheVersion;

    const patterns = [
        `${REGION_CACHE_PREFIX}:${v}:*`,
    ];

    for (const pattern of patterns) {
        try {
            const keys = await redis.keys(pattern);
            if (keys.length > 0) {
                await redis.del(...keys);
                console.log(
                    `[SDE] Cleared ${keys.length} Redis keys for pattern "${pattern}"`,
                );
            } else {
                console.log(
                    `[SDE] No Redis keys matched pattern "${pattern}"`,
                );
            }
        } catch (err) {
            console.error(
                `[SDE] Failed to clear Redis keys for pattern "${pattern}":`,
                err,
            );
        }
    }
}
