/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

import * as path from 'path'
import * as readline from 'readline'
import * as fs from 'fs'
import { SDE_DIR } from '../../config'
import { prisma } from '../../lib/prisma'
import { logger } from '../../lib/logger'

type SolarSystemRow = {
    _key: number
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

export async function computeConstellationLinks(dryRun = false) {
    if (dryRun) {
        logger.info('🧪 Dry-run: would compute constellation links.')
        return
    }

    // 1) solarSystemID -> constellationID
    const solarToConstellation = new Map<number, number>()

    {
        const file = path.join(SDE_DIR, 'mapSolarSystems.jsonl')
        const rl = readline.createInterface({
            input: fs.createReadStream(file),
            crlfDelay: Infinity,
        })

        for await (const line of rl) {
            if (!line.trim()) continue
            const json = JSON.parse(line) as SolarSystemRow

            solarToConstellation.set(json._key, json.constellationID)
        }
    }

    // 2) Collect constellation-pairs
    const edgeKeys = new Set<string>()

    {
        const file = path.join(SDE_DIR, 'mapStargates.jsonl')
        const rl = readline.createInterface({
            input: fs.createReadStream(file),
            crlfDelay: Infinity,
        })

        for await (const line of rl) {
            if (!line.trim()) continue
            const json = JSON.parse(line) as StargateRow

            const fromConstellation = solarToConstellation.get(
                json.solarSystemID,
            )
            const toConstellation = solarToConstellation.get(
                json.destination.solarSystemID,
            )
            if (!fromConstellation || !toConstellation) continue
            if (fromConstellation === toConstellation) continue

            const a = Math.min(fromConstellation, toConstellation)
            const b = Math.max(fromConstellation, toConstellation)
            const key = `${a}:${b}`

            edgeKeys.add(key)
        }
    }

    // 3) Prepare for DB
    const links = Array.from(edgeKeys).map((key) => {
        const [fromConstellationId, toConstellationId] = key
            .split(':')
            .map(Number)
        return { fromConstellationId, toConstellationId }
    })

    // 4) Safe to DB
    await prisma.constellationLink.deleteMany()
    await prisma.constellationLink.createMany({
        data: links,
        skipDuplicates: true,
    })

    logger.info(`✅ Stored ${links.length} constellation links`)
}
