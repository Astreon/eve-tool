/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

import { updateStaticData } from '../../packages/sde/src/index.js'
import { runCollectorJob } from '../../packages/collector/src/index.js'
import { logger } from './lib/logger.js'

export type WorkerTaskId = 'sdeUpdate' | 'systemActivity'

export interface WorkerTask {
    id: WorkerTaskId
    cron: string
    description: string
    run: () => Promise<void>
}

export const WORKER_TASKS: WorkerTask[] = [
    {
        id: 'sdeUpdate',
        cron: '15 12 * * *',
        description: 'Update SDE (version-aware) daily at 12:15',
        run: async () => {
            logger.info('🔄 Running SDE update task')
            await updateStaticData()
        },
    },
    {
        id: 'systemActivity',
        cron: '15 * * * *',
        description:
            'Collect system activity snapshot from ESI every hour at 15th minute',
        run: async () => {
            logger.info('📡 Running system activity collector task')
            await runCollectorJob('systemActivity', { dryRun: false })
        },
    },
    // Example:
    // {
    //   id: 'kills',
    //   cron: '0 * * * *', // jede Stunde
    //   description: 'Fetch kills / zKill data every 60 minutes',
    //   run: async () => {
    //     await runCollectorJob('kills', { dryRun: false })
    //   }
    // },
]

export function getEnabledWorkerTasks(): WorkerTask[] {
    const raw = process.env.WORKER_ENABLED_TASKS

    if (!raw) return WORKER_TASKS

    const requestedIds = new Set(
        raw
            .split(',')
            .map((v) => v.trim())
            .filter((v): v is WorkerTaskId =>
                (['sdeUpdate', 'systemActivity'] as WorkerTaskId[]).includes(
                    v as WorkerTaskId,
                ),
            ),
    )

    if (requestedIds.size === 0) return WORKER_TASKS

    return WORKER_TASKS.filter((t) => requestedIds.has(t.id))
}
