/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

import { logger } from '../lib/logger'
import {
    COLLECTOR_JOBS,
    type CollectorJobId,
    type CollectorOptions,
} from '../jobs'

type ParsedArgs = {
    jobId: CollectorJobId
    options: CollectorOptions
}

function normalizeJobId(raw: string | undefined): CollectorJobId {
    const value = (raw ?? '').toLowerCase()

    switch (value) {
        case 'systemactivity':
        case 'system-activity':
        case 'system_activity':
            return 'systemActivity'
        default:
            return 'systemActivity'
    }
}

function parseArgs(argv: string[]): ParsedArgs {
    const positional: string[] = []
    const options: CollectorOptions = {
        dryRun: false,
    }

    for (const arg of argv) {
        if (arg === '--dry-run') {
            options.dryRun = true
            continue
        }

        if (arg.startsWith('-')) {
            logger.warn({ arg }, '⚠️ Unknown option for collector CLI')
            continue
        }

        positional.push(arg)
    }

    const jobId = normalizeJobId(positional[0])

    return { jobId, options }
}

function printHelp() {
    const msg = `
Usage: collector <job> [options]

Jobs:
  system-activity    Collects system activity snapshot from ESI and persists it

Options:
  --dry-run          Do not write to the database, just log actions
`
    console.log(msg)
}

void (async () => {
    try {
        const { jobId, options } = parseArgs(process.argv.slice(2))

        const job = COLLECTOR_JOBS[jobId]

        if (!job) {
            logger.error({ jobId }, '❌ Unknown collector job')
            printHelp()
            process.exitCode = 1
            return
        }

        logger.info({ jobId, options }, '🚀 Starting collector job')
        await job(options)
        logger.info({ jobId }, '✅ Collector job finished')
    } catch (err) {
        logger.error(err, '❌ Collector CLI failed')
        process.exitCode = 1
    }
})()
