import * as path from "path";
import * as readline from "readline";
import * as fs from "fs";
import {prisma} from "../../src/lib/prisma.js";
import {ImportResult} from "../importer.js";
import {BATCH_SIZE, SDE_DIR} from "../config";
import {Prisma} from "../../src/generated/client.js";

export const importRaces = async (dryRun = false): Promise<ImportResult> => {
    const filePath = path.join(SDE_DIR, 'races.jsonl')
    if (!fs.existsSync(filePath)) {
        throw new Error(`Missing File: ${filePath}`)
    }

    const rl = readline.createInterface({
        input: fs.createReadStream(filePath),
        crlfDelay: Infinity,
    })

    const batch: Prisma.RaceCreateManyInput[] = []
    let success = 0
    let total = 0
    let errors = 0

    for await (const line of rl) {
        total++
        try {
            const json = JSON.parse(line)
            const data: Prisma.RaceCreateManyInput = {
                id: json._key,
                name: json.name?.en ?? 'Unknown',
                description: json.description?.en ?? null,
            }
            batch.push(data)

            if (batch.length >= BATCH_SIZE) {
                if (!dryRun) {
                    await Promise.all(
                        batch.map(row =>
                            prisma.race.upsert({
                                where: {id: row.id},
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
            console.log(`❌ Parse/DB error @line ${total}:`, (err as Error).message)
        }
    }

    if (batch.length > 0) {
        if (!dryRun) {
            await Promise.all(
                batch.map(row =>
                    prisma.race.upsert({
                        where: {id: row.id},
                        create: row,
                        update: row,
                    }),
                ),
            )
        }
        success += batch.length
    }

    return {success, total, errors}
}
