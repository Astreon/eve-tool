import * as path from "path";
import * as readline from "readline";
import * as fs from "fs";
import {prisma} from "../../src/lib/prisma.js";
import {ImportResult} from "../importer.js";
import {BATCH_SIZE, SDE_DIR} from "../config";

export const importFactions = async (dryRun = false): Promise<ImportResult> => {
  const filePath = path.join(SDE_DIR, 'factions.jsonl')
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing File: ${filePath}`)
  }

  const rl = readline.createInterface({
    input: fs.createReadStream(filePath),
    crlfDelay: Infinity,
  })

  const batch: { id: number; name: string }[] = []
  let success = 0
  let total = 0
  let errors = 0

  for await (const line of rl) {
    total++
    try {
      const json = JSON.parse(line)
      const data = {
        id: json._key,
        name: json.name?.de || 'Unknown',
      }
      batch.push(data)

      if (batch.length >= BATCH_SIZE) {
        if (!dryRun)
          await prisma.faction.createMany({ data: batch, skipDuplicates: true })
        success += batch.length
        batch.length = 0
      }
    } catch (err) {
      errors++
      console.log(`❌ Parse/DB error @line ${total}:`, (err as Error).message)
    }
  }

  if (batch.length > 0) {
    if (!dryRun)
      await prisma.faction.createMany({ data: batch, skipDuplicates: true })
    success += batch.length
  }

  return { success, total, errors }
}