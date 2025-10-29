import {PrismaClient} from "../src/generated/client.js";
import * as fs from "fs";
import * as readline from "node:readline";

const prisma = new PrismaClient()

async function importBloodlines() {
    const fileStream = await fs.createReadStream('../.sde/bloodlines.jsonl')

    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity,
    })

    console.log('🚀  Starting Static Data import from "local"...')

    for await (const line of rl) {
        if (!line.trim()) continue

        const json = JSON.parse(line);
        const id = json._key
        const name = json.name.de ?? 'Unknown' // or json.name?.de ?? json.name?.en ?? 'Unknown'

        await prisma.bloodLine.upsert({
            where: { id },
            update: { name },
            create: {id, name},
        })
    }
    console.log('📲  Imported Bloodlines')

    console.log('✅  Import completed')
    await prisma.$disconnect()
}

importBloodlines().catch(async err => {
    console.log('❌  Error during import: ', err)
    await prisma.$disconnect()
    process.exit(1)
})