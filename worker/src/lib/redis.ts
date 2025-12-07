/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

import { Redis } from 'ioredis'
import { logger } from './logger.js'

const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379/0'
const parsed = new URL(redisUrl)

const redisHost = parsed.hostname
const redisPort = parsed.port || '6379'
const redisDb = parsed.pathname.replace('/', '') || '0'
const redisUser = parsed.username || undefined

export const redis = new Redis(redisUrl)

redis.on('ready', () => {
    logger.info(
        {
            kind: 'REDIS',
            host: redisHost,
            port: Number(redisPort),
            db: redisDb,
            user: redisUser,
        },
        'Connected to Redis for worker',
    )
})

redis.on('error', (err) => {
    logger.error({ err }, 'Redis error in worker process')
})
