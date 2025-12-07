/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

import pino, { type LoggerOptions, type Logger } from 'pino'

export interface CreateLoggerOptions {
    name: string
    level?: string
}

/**
 * LOG_PRETTY=true -> pino-pretty (for Dev)
 * LOG_LEVEL=info -> Log-Level
 */
export function createLogger(options: CreateLoggerOptions): Logger {
    const transport =
        process.env.LOG_PRETTY === 'true'
            ? pino.transport({
                  target: 'pino-pretty',
                  options: {
                      colorize: true,
                      translateTime: 'SYS:standard',
                      ignore: 'pid,hostname',
                  },
              })
            : undefined

    const baseOptions: LoggerOptions = {
        name: options.name,
        level: options.level ?? process.env.LOG_LEVEL ?? 'info',
        redact: {
            paths: ['password', '*.password', 'redis.password', 'db.password'],
            censor: '***',
        },
    }

    return pino(baseOptions, transport)
}
