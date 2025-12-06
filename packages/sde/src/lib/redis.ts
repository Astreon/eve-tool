/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

import { Redis } from 'ioredis'
import { logger } from './logger.js'

const redisUrl = process.env.REDIS_URL

export const redis = new Redis(redisUrl ?? 'localhost')

redis.on('ready', () => {
    logger.info(`🔌 Connected to Redis for SDE (url=${redisUrl})`)
})

redis.on('error', (err) => {
    logger.error('❌ Redis error in SDE process:', err)
})
