/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

// TODO: Run this every hour, at 30 minutes

import { sdePrisma } from '../lib/prisma'
import { getSystemActivitySnapshot } from '../../src/services/esi'
import { sdeLogger } from '../lib/logger'

function getCurrentHourBucket(): Date {
    const now = new Date()
    now.setMinutes(0, 0, 0)
    return now
}

async function main() {
    const bucket = getCurrentHourBucket()
    sdeLogger.info(
        { bucket: bucket.toISOString() },
        'SystemActivity: collecting snapshot for current hour',
    )

    const snapshot = await getSystemActivitySnapshot()

    const rows = Array.from(snapshot.data.values())

    sdeLogger.info(
        { count: rows.length },
        'SystemActivity: writing samples for systems with activity',
    )

    for (const row of rows) {
        await sdePrisma.systemActivitySample.upsert({
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

    sdeLogger.info('SystemActivity: done')
}

main()
    .then(async () => {
        try {
            await sdePrisma.$disconnect()
        } catch (err) {
            sdeLogger.error(
                { err },
                'SystemActivity: error during prisma disconnect',
            )
        }
        process.exit(0)
    })
    .catch(async (err) => {
        sdeLogger.error({ err }, 'SystemActivity: error during execution')
        try {
            await sdePrisma.$disconnect()
        } catch (disconnectErr) {
            sdeLogger.error(
                { err: disconnectErr },
                'SystemActivity: error during prisma disconnect',
            )
        }
        process.exit(1)
    })
