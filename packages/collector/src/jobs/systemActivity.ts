/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

// TODO: Run this every hour, at 30 minutes

import { collectorLogger } from '../lib/logger.js'
import { prisma } from '../../../../backend/src/lib/prisma.js'
import { getSystemActivitySnapshot } from '../../../../backend/src/services/esi'

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

    collectorLogger.info(
        '📊 Collector – fetching system activity snapshot from ESI...',
    )

    const bucket = getCurrentHourBucket()
    const snapshot = await getSystemActivitySnapshot()
    const rows = Array.from(snapshot.data.values())

    collectorLogger.info(
        `Collector – received ${rows.length} system activity entries`,
    )

    if (dryRun) {
        collectorLogger.info(
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

    collectorLogger.info(
        `✅ Collector – persisted ${rows.length} system activity entries`,
    )
}

if (process.argv[1]?.endsWith('systemActivity.ts')) {
    systemActivity()
        .then(() => process.exit(0))
        .catch((err) => {
            collectorLogger.error(err, '❌ Collector – system activity failed')
            process.exit(1)
        })
}
