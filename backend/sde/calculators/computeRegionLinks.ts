/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

import * as path from "path";
import * as readline from "readline";
import * as fs from "fs";
import {SDE_DIR} from "../config";
import {prisma} from "../../src/lib/prisma";

type SolarSystemRow = {
    _key: number
    regionID: number
}

type StargateRow = {
    _key: number
    solarSystemID: number
    destination: {
        solarSystemID: number
        stargateID: number
    }
}

export async function recomputeRegionLinks() {
    // 1) solarSystemID -> regionID
    const solarToRegion = new Map<number, number>()

    {
        const file = path.join(SDE_DIR, "mapSolarSystems.jsonl");
        const rl = readline.createInterface({
            input: fs.createReadStream(file),
            crlfDelay: Infinity,
        })

        for await (const line of rl) {
            if (!line.trim()) continue
            const json = JSON.parse(line) as SolarSystemRow

            solarToRegion.set(json._key, json.regionID)
        }
    }

    // 2) Collect region-pairs
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

            const fromRegion = solarToRegion.get(json.solarSystemID)
            const toRegion = solarToRegion.get(json.destination.solarSystemID)
            if (!fromRegion || !toRegion) continue
            if (fromRegion === toRegion) continue

            const a = Math.min(fromRegion, toRegion)
            const b = Math.max(fromRegion, toRegion)
            const key = `${a}:${b}`

            edgeKeys.add(key)
        }
    }

    // 3) Prepare for DB
    const links = Array.from(edgeKeys).map((key) => {
        const [fromRegionId, toRegionId] = key.split(":").map(Number)
        return {fromRegionId, toRegionId}
    })

    // 4) Safe to DB
    await prisma.regionLink.deleteMany();
    await prisma.regionLink.createMany({
        data: links,
        skipDuplicates: true,
    });

    console.log(`✅ Stored ${links.length} region links`);
}