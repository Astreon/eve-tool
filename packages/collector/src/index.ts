/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

import { logger } from './lib/logger.js'

import { systemActivity } from './jobs/systemActivity'
import { COLLECTOR_JOBS } from './jobs'
import type { CollectorJobId, CollectorOptions } from './jobs'

export { systemActivity }

export {
    COLLECTOR_JOBS,
    type CollectorJobFn,
    type CollectorJobId,
    type CollectorOptions,
} from './jobs'

export async function runCollectorJob(
    jobId: CollectorJobId,
    options: CollectorOptions = {},
): Promise<void> {
    const job = COLLECTOR_JOBS[jobId]

    if (!job) {
        logger.error({ jobId }, '❌ Unknown collector job')
        throw new Error(`Unknown collector job: ${jobId}`)
    }

    logger.info({ jobId, options }, '🚀 Starting collector job')
    await job(options)
    logger.info({ jobId }, '✅ Collector job finished')
}

export async function runAllCollectorJobs(
    options: CollectorOptions = {},
): Promise<void> {
    const jobIds = Object.keys(COLLECTOR_JOBS) as CollectorJobId[]

    logger.info(
        { jobIds, options },
        '🚀 Starting all collector jobs (sequentially)',
    )

    for (const jobId of jobIds) {
        const job = COLLECTOR_JOBS[jobId]
        logger.info({ jobId }, '▶ Running collector job')
        await job(options)
    }

    logger.info('✅ All collector jobs finished')
}
