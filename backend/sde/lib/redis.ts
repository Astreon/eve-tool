/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

import { Redis } from 'ioredis'
import config from '../../src/config/config.js'
import { sdeLogger } from './logger.js'

export const sdeRedis = new Redis({
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password,
    db: 0,
})

sdeRedis.on('ready', () => {
    sdeLogger.info(
        `🔌 Connected to Redis for SDE (host=${config.redis.host}, port=${config.redis.port})`,
    )
})

sdeRedis.on('error', (err) => {
    sdeLogger.error('❌ Redis error in SDE process:', err)
})
