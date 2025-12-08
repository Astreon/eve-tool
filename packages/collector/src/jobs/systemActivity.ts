/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

import { logger } from '../lib/logger.js'
import { prisma } from '../lib/prisma.js'
import { getSystemActivitySnapshot } from '../../../../backend/src/services/esi/index.js'

export type SystemActivityCollectorOptions = {
    dryRun?: boolean
}

function getCurrentHourBucket(): Date {
    const now = new Date()
    now.setMinutes(0, 0, 0)
    return now
}

export async function systemActivity(
    options: SystemActivityCollectorOptions = {},
) {
    const { dryRun } = options

    logger.info('📊 Collector fetching system activity snapshot from ESI...')

    const bucket = getCurrentHourBucket()
    const snapshot = await getSystemActivitySnapshot()

    if (snapshot.source === 'cache') {
        logger.info(
            '⏩ System activity unchanged (ETag/cache) – skipping DB writes for this bucket.',
        )
        return
    }

    const rows = Array.from(snapshot.data.values())
    logger.info(`Collector received ${rows.length} system activity entries`)

    if (dryRun) {
        logger.info(
            '🧪 DRY-RUN: skipping persistence of system activity snapshot.',
        )
        return
    }

    for (const row of rows) {
        await prisma.systemActivitySample.upsert({
            where: {
                systemId_timestamp: {
                    systemId: row.systemId,
                    timestamp: bucket,
                },
            },
            update: {
                jumps: row.jumps ?? 0,
                npcKills: row.npcKills ?? 0,
                shipKills: row.shipKills ?? 0,
                podKills: row.podKills ?? 0,
            },
            create: {
                systemId: row.systemId,
                timestamp: bucket,
                jumps: row.jumps ?? 0,
                npcKills: row.npcKills ?? 0,
                shipKills: row.shipKills ?? 0,
                podKills: row.podKills ?? 0,
            },
        })
    }

    logger.info(`✅ Collector persisted ${rows.length} system activity entries`)
}
