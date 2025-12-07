/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

import cron from 'node-cron'
import { logger } from './lib/logger.js'
import { WORKER_TASKS } from './tasks.js'

void (async () => {
    logger.info('🚀 Starting worker scheduler')

    for (const task of WORKER_TASKS) {
        cron.schedule(task.cron, () => {
            logger.info(
                { taskId: task.id, schedule: task.cron },
                '▶ Running worker task',
            )

            task.run()
                .then(() => {
                    logger.info({ taskId: task.id }, '✅ Worker task finished')
                })
                .catch((err) => {
                    logger.error(
                        { taskId: task.id, err },
                        '❌ Worker task failed',
                    )
                })
        })

        logger.info(
            { taskId: task.id, schedule: task.cron },
            '⏰ Scheduled worker task',
        )
    }

    logger.info('🧠 Worker is now running and waiting for tasks...')
})()
