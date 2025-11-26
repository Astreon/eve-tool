/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

import pino, { Logger as PinoLogger, Level } from 'pino';
import config from '../config/config.js';

export type LogMeta = Record<string, unknown>;

export type LogKind = 'APP' | 'HTTP' | 'ESI' | 'REDIS' | 'DB' | string;

const isDev = config.nodeEnv === 'development';
const isTest = config.nodeEnv === 'test';

const baseLogger: PinoLogger = pino({
    level: process.env.LOG_LEVEL ?? (isDev ? 'debug' : 'info'),
    transport: isDev
        ? {
              target: 'pino-pretty',
              options: {
                  colorize: true,
                  translateTime: 'SYS:standard',
                  singleLine: true,
              },
          }
        : undefined,
});

function log(level: Level, kind: LogKind, message: string, meta?: LogMeta) {
    // be silent in tests - mocking logger in test anyway
    if (isTest) return;

    if (meta && Object.keys(meta).length > 0) {
        baseLogger[level]({
            kind,
            msg: message,
            ...meta,
        });
    } else {
        baseLogger[level]({ kind, msg: message });
    }
}

export const logger = {
    debug(kind: LogKind, message: string, meta?: LogMeta) {
        log('debug', kind, message, meta);
    },

    info(kind: LogKind, message: string, meta?: LogMeta) {
        log('info', kind, message, meta);
    },

    warn(kind: LogKind, message: string, meta?: LogMeta) {
        log('warn', kind, message, meta);
    },

    error(kind: LogKind, message: string, meta?: LogMeta) {
        log('error', kind, message, meta);
    },

    // --- Domain-specific loggers
    entityFromRedis(
        kind: LogKind,
        id: number | string,
        opts: {
            ttl?: number;
            cachedAt?: string | null;
            durationMs?: number;
        } = {},
    ) {
        const meta: LogMeta = {
            id,
            source: 'redis',
            ttl: opts.ttl,
            cachedAt: opts.cachedAt ?? undefined,
            durationMs: opts.durationMs,
        };
        log('info', kind, 'entity.from.redis', meta);
    },

    entityFromEsi(
        kind: LogKind,
        id: number | string,
        opts: {
            etag?: string | null;
            status?: number;
            durationMs?: number;
        } = {},
    ) {
        const meta: LogMeta = {
            id,
            source: 'esi',
            etag: opts.etag ?? undefined,
            status: opts.status,
            durationMs: opts.durationMs,
        };
        log('info', kind, 'entity.from.esi', meta);
    },

    entityFromDb(
        kind: LogKind,
        id: number | string,
        opts: { lastUpdated?: string | null; durationMs?: number } = {},
    ) {
        const meta: LogMeta = {
            id,
            source: 'db',
            lastUpdated: opts.lastUpdated ?? undefined,
            durationMs: opts.durationMs,
        };
        log('info', kind, 'entity.from.db', meta);
    },
} as const;
