/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

import { Redis } from 'ioredis'
import { sdeLogger } from './logger.js'

const redisUrl = process.env.REDIS_URL

export const sdeRedis = new Redis(redisUrl ?? 'localhost')

sdeRedis.on('ready', () => {
    sdeLogger.info(`🔌 Connected to Redis for SDE (url=${redisUrl})`)
})

sdeRedis.on('error', (err) => {
    sdeLogger.error('❌ Redis error in SDE process:', err)
})
