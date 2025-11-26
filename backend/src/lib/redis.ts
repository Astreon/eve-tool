/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

import { Redis } from 'ioredis'
import config from '../config/config.js'
import { logger } from './logger.js'

export const redis = new Redis({
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password,
    db: 0,
})

redis.on('ready', async () => {
    logger.info('REDIS', 'Connected to Redis', {
        host: config.redis.host,
        port: config.redis.port,
    })
})

redis.on('error', (err) => {
    logger.error('REDIS', 'Error connecting to Redis', {
        message: err?.message ?? String(err),
    })
})
