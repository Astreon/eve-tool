/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

import type { WorkerTaskId } from '../tasks'
import { logger } from './logger'
import { redis } from './redis'

const HEALTH_KEY_PREFIX = 'worker:task'

export interface WorkerTaskHealth {
    lastSuccessAt?: string
    lastErrorAt?: string
    lastErrorMessage?: string
    lastDurationMs?: number
    runCount: number
    errorCount: number
}

function getKey(taskId: WorkerTaskId): string {
    return `${HEALTH_KEY_PREFIX}:${taskId}:health`
}

export async function markTaskSuccess(
    taskId: WorkerTaskId,
    durationMs: number,
): Promise<void> {
    const key = getKey(taskId)
    const nowIso = new Date().toISOString()

    try {
        await redis
            .multi()
            .hset(key, {
                lastSuccessAt: nowIso,
                lastDurationMs: String(durationMs),
            })
            .hincrby(key, 'runCount', 1)
            .exec()
    } catch (err) {
        logger.error(
            { taskId, err },
            'Failed to update worker task success health',
        )
    }
}

export async function markTaskError(
    taskId: WorkerTaskId,
    error: unknown,
    durationMs?: number,
): Promise<void> {
    const key = getKey(taskId)
    const nowIso = new Date().toISOString()
    const message = error instanceof Error ? error.message : String(error)

    const fields: Record<string, string> = {
        lastErrorAt: nowIso,
        lastErrorMessage: message,
    }

    if (typeof durationMs === 'number') {
        fields.lastDurationMs = String(durationMs)
    }

    try {
        await redis
            .multi()
            .hset(key, fields)
            .hincrby(key, 'runCount', 1)
            .hincrby(key, 'errorCount', 1)
            .exec()
    } catch (err) {
        logger.error(
            { taskId, err },
            'Failed to update worker task error health',
        )
    }
}

export async function getTaskHealth(
    taskId: WorkerTaskId,
): Promise<WorkerTaskHealth | null> {
    const key = getKey(taskId)
    const data = await redis.hgetall(key)

    if (!data || Object.keys(data).length === 0) {
        return null
    }

    return {
        lastSuccessAt: data.lastSuccessAt,
        lastErrorAt: data.lastErrorAt,
        lastErrorMessage: data.lastErrorMessage,
        lastDurationMs: data.lastDurationMs
            ? Number(data.lastDurationMs)
            : undefined,
        runCount: data.runCount ? Number(data.runCount) : 0,
        errorCount: data.errorCount ? Number(data.errorCount) : 0,
    }
}
