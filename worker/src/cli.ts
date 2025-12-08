/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

import cron from 'node-cron'
import { logger } from './lib/logger.js'
import { getEnabledWorkerTasks, type WorkerTask } from './tasks.js'
import { markTaskError, markTaskSuccess } from './lib/health.js'

async function runTask(task: WorkerTask): Promise<void> {
    const startedAt = Date.now()

    logger.info({ taskId: task.id, schedule: task.cron }, 'Running worker task')

    try {
        await task.run()

        const durationMs = Date.now() - startedAt
        await markTaskSuccess(task.id, durationMs)

        logger.info({ taskId: task.id, durationMs }, 'Worker task finished')
    } catch (err) {
        const durationMs = Date.now() - startedAt
        await markTaskError(task.id, err, durationMs)

        logger.error({ taskId: task.id, err, durationMs }, 'Worker task failed')
    }
}

void (async () => {
    const tasks = getEnabledWorkerTasks()

    logger.info(
        {
            enabledTaskIds: tasks.map((task) => task.id),
        },
        'Starting worker scheduler',
    )

    for (const task of tasks) {
        cron.schedule(task.cron, () => {
            void runTask(task)
        })

        logger.info(
            { taskId: task.id, schedule: task.cron },
            'Scheduled worker task',
        )
    }

    logger.info('Worker is now running and waiting for tasks...')
})()
