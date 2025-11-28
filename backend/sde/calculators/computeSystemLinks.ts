/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

import * as path from 'path'
import * as readline from 'readline'
import * as fs from 'fs'
import { SDE_DIR } from '../config'
import { sdePrisma } from '../lib/prisma'
import { sdeLogger } from '../lib/logger'

type StargateRow = {
    _key: number
    solarSystemID: number
    destination: {
        solarSystemID: number
        stargateID: number
    }
}

export async function computeSystemLinks(dryRun = false) {
    if (dryRun) {
        sdeLogger.info('🧪 Dry-run: would compute system links.')
        return
    }

    // 1) Collect unique system-pairs based on stargates
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

            const fromSystem = json.solarSystemID
            const toSystem = json.destination.solarSystemID

            if (!fromSystem || !toSystem) continue
            if (fromSystem === toSystem) continue

            const a = Math.min(fromSystem, toSystem)
            const b = Math.max(fromSystem, toSystem)
            const key = `${a}:${b}`

            edgeKeys.add(key)
        }
    }

    // 2) Prepare for DB
    const links = Array.from(edgeKeys).map((key) => {
        const [fromSystemId, toSystemId] = key.split(':').map(Number)
        return { fromSystemId, toSystemId }
    })

    // 3) Save to DB
    await sdePrisma.systemLink.deleteMany()
    await sdePrisma.systemLink.createMany({
        data: links,
        skipDuplicates: true,
    })

    sdeLogger.info(`✅ Stored ${links.length} system links`)
}
