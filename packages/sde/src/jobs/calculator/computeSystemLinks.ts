/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

import * as path from 'path'
import * as readline from 'readline'
import * as fs from 'fs'
import { SDE_DIR } from '../../config.js'
import { prisma } from '../../lib/prisma.js'
import { logger } from '../../lib/logger.js'

type SolarSystemRow = {
    _key: number
    regionID: number
    constellationID: number
}

type StargateRow = {
    _key: number
    solarSystemID: number
    destination: {
        solarSystemID: number
        stargateID: number
    }
}

type BorderType = 'INTERNAL' | 'CONSTELLATION' | 'REGION'

export async function computeSystemLinks(dryRun = false) {
    if (dryRun) {
        logger.info('🧪 Dry-run: would compute system links.')
        return
    }

    // 1) Load system meta data
    const meta = new Map<
        number,
        { regionId: number; constellationId: number }
    >()

    {
        const file = path.join(SDE_DIR, 'mapSolarSystems.jsonl')
        const rl = readline.createInterface({
            input: fs.createReadStream(file),
            crlfDelay: Infinity,
        })

        for await (const line of rl) {
            if (!line.trim()) continue
            const json = JSON.parse(line) as SolarSystemRow

            meta.set(json._key, {
                regionId: json.regionID,
                constellationId: json.constellationID,
            })
        }
    }

    // 2) Collect system-pairs
    const edges = new Map<string, BorderType>()

    {
        const file = path.join(SDE_DIR, 'mapStargates.jsonl')
        const rl = readline.createInterface({
            input: fs.createReadStream(file),
            crlfDelay: Infinity,
        })

        const rank: Record<BorderType, number> = {
            INTERNAL: 0,
            CONSTELLATION: 1,
            REGION: 2,
        }

        for await (const line of rl) {
            if (!line.trim()) continue
            const json = JSON.parse(line) as StargateRow

            const fromId = json.solarSystemID
            const toId = json.destination.solarSystemID

            const from = meta.get(fromId)
            const to = meta.get(toId)
            if (!from || !to) continue
            if (fromId === toId) continue

            let borderType: BorderType
            if (from.regionId !== to.regionId) {
                borderType = 'REGION'
            } else if (from.constellationId !== to.constellationId) {
                borderType = 'CONSTELLATION'
            } else {
                borderType = 'INTERNAL'
            }

            const a = Math.min(fromId, toId)
            const b = Math.max(fromId, toId)
            const key = `${a}:${b}`

            const existing = edges.get(key)
            if (!existing || rank[borderType] > rank[existing]) {
                edges.set(key, borderType)
            }
        }
    }

    // 3) Prepare for DB
    const links = Array.from(edges.entries()).map(([key, borderType]) => {
        const [fromSystemId, toSystemId] = key.split(':').map(Number)
        return { fromSystemId, toSystemId, borderType }
    })

    // 4) Save to DB
    await prisma.systemLink.deleteMany()
    await prisma.systemLink.createMany({
        data: links,
        skipDuplicates: true,
    })

    logger.info(`✅ Stored ${links.length} system links`)
}
