/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

import * as path from 'path'
import * as readline from 'readline'
import * as fs from 'fs'
import { prisma } from '../../lib/prisma'
import { ImportResult } from '../../import/importer'
import { BATCH_SIZE, SDE_DIR } from '../../config'
import { Prisma } from '@eve-toolkit/db'
import { logger } from '../../lib/logger'
import { createProgressBar } from '../../lib/progress'

async function countLines(filePath: string): Promise<number> {
    return new Promise<number>((resolve, reject) => {
        let count = 0
        const stream = fs.createReadStream(filePath)
        const rl = readline.createInterface({
            input: stream,
            crlfDelay: Infinity,
        })

        rl.on('line', () => {
            count++
        })
        rl.on('close', () => resolve(count))
        rl.on('error', (err) => reject(err))
        stream.on('error', (err) => reject(err))
    })
}

export const importStationOperations = async (
    dryRun = false,
    label: string,
): Promise<ImportResult> => {
    const filePath = path.join(SDE_DIR, 'stationOperations.jsonl')
    if (!fs.existsSync(filePath)) {
        throw new Error(`Missing File: ${filePath}`)
    }

    const totalLines = await countLines(filePath)
    const rl = readline.createInterface({
        input: fs.createReadStream(filePath),
        crlfDelay: Infinity,
    })

    const batch: Prisma.StationOperationCreateManyInput[] = []
    let success = 0
    let total = 0
    let errors = 0

    const progress = createProgressBar({
        label,
        total: totalLines,
        redrawEvery: 1_000,
    })

    for await (const line of rl) {
        total++
        progress.tick()

        if (!line.trim()) continue

        try {
            const json = JSON.parse(line)
            const data: Prisma.StationOperationCreateManyInput = {
                id: json._key,
                activityId: json.activityID,
                border: json.border,
                corridor: json.corridor,
                name: json.operationName?.en,
                description: json.description?.en ?? null,
                fringe: json.fringe,
                hub: json.hub,
                manufacturingFactor: json.manufacturingFactor,
                ratio: json.ratio,
                researchFactor: json.researchFactor,
                services: json.services,
            }
            batch.push(data)

            if (batch.length >= BATCH_SIZE) {
                if (!dryRun) {
                    await Promise.all(
                        batch.map((row) =>
                            prisma.stationOperation.upsert({
                                where: { id: row.id },
                                create: row,
                                update: row,
                            }),
                        ),
                    )
                }
                success += batch.length
                batch.length = 0
            }
        } catch (err) {
            errors++
            logger.error(
                `❌ Parse/DB error @line ${total}:`,
                (err as Error).message,
            )
        }
    }

    if (batch.length > 0) {
        if (!dryRun) {
            await Promise.all(
                batch.map((row) =>
                    prisma.stationOperation.upsert({
                        where: { id: row.id },
                        create: row,
                        update: row,
                    }),
                ),
            )
        }
        success += batch.length
    }

    progress.done({ clear: true })

    return { success, total, errors }
}
