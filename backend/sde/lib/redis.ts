/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

import { Redis } from 'ioredis'
import config from '../../src/config/config.js'
import { sdeLogger } from './logger.js'

const redisUrl = process.env.REDIS_URL

export const sdeRedis = new Redis(redisUrl ?? 'localhost')

sdeRedis.on('ready', () => {
    sdeLogger.info(
        `🔌 Connected to Redis for SDE (host=${config.redis.host}, port=${config.redis.port})`,
    )
})

sdeRedis.on('error', (err) => {
    sdeLogger.error('❌ Redis error in SDE process:', err)
})
