import * as fs from 'fs'
import * as path from 'path'
import * as readline from 'readline'
import {prisma} from "../src/lib/prisma";
import {SDE_DIR} from "./config";

export interface SdeVersion {
    key: 'sde'
    buildNumber: number
    releaseDate: Date
}

const VERSION_FILE = path.join(SDE_DIR, '_sde.jsonl')

export async function readSdeVersionFromFile(): Promise<SdeVersion> {
    if (!fs.existsSync(VERSION_FILE)) {
        throw new Error(
            `Missing version file: ${VERSION_FILE}\n` +
            `Expect JSON with a entry: {"_key":"sde","buildNumber":...,"releaseDate":"..."}`
        )
    }

    const rl = readline.createInterface({
        input: fs.createReadStream(VERSION_FILE),
        crlfDelay: Infinity,
    })

    for await (const line of rl) {
        const obj = JSON.parse(line)
        if (obj?._key === 'sde' && typeof obj.buildNumber === 'number') {
            return {
                key: 'sde',
                buildNumber: obj.buildNumber,
                releaseDate: obj.releaseDate,
            }
        }
    }

    throw new Error(`Can not find any valid version information in  ${VERSION_FILE}`)
}

export async function getDbVersion(): Promise<SdeVersion | null> {
    const v = await prisma.version.findUnique({where: {key: 'sde'}})
    return v
        ? {key: 'sde', buildNumber: v.buildNumber, releaseDate: v.releaseDate}
        : null
}

export async function upsertDbVersion(v: SdeVersion) {
    await prisma.version.upsert({
        where: { key: 'sde'},
        create: {
            key: 'sde',
            buildNumber: v.buildNumber,
            releaseDate: v.releaseDate,
        },
        update: {
            buildNumber: v.buildNumber,
            releaseDate: v.releaseDate,
        }
    })
}