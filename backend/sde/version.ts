/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

import * as fs from 'fs'
import * as path from 'path'
import * as readline from 'readline'
import { prisma } from '../src/lib/prisma'
import { SDE_DIR } from './config'

export interface SdeVersion {
    key: 'sde'
    buildNumber: number
    releaseDate: Date
}

const VERSION_FILE = path.join(SDE_DIR, '_sde.jsonl')

type VersionFileRecord = {
    _key?: string
    buildNumber?: number | string
    releaseDate?: string
    [key: string]: unknown
}

export async function readSdeVersionFromFile(): Promise<SdeVersion> {
    if (!fs.existsSync(VERSION_FILE)) {
        throw new Error(
            `Missing version file: ${VERSION_FILE}\n` +
                `Expect JSON with an entry: {"_key":"sde","buildNumber":...,"releaseDate":"..."}`,
        )
    }

    const rl = readline.createInterface({
        input: fs.createReadStream(VERSION_FILE),
        crlfDelay: Infinity,
    })

    for await (const line of rl) {
        const trimmed = line.trim()
        if (!trimmed) continue

        const obj = JSON.parse(trimmed) as VersionFileRecord
        if (obj._key === 'sde' && obj.buildNumber != null) {
            const buildNumber = Number(obj.buildNumber)
            if (!Number.isFinite(buildNumber)) {
                continue
            }

            const dateRaw = obj.releaseDate
            const releaseDate = dateRaw ? new Date(dateRaw) : new Date(0)

            if (Number.isNaN(releaseDate.getTime())) {
                throw new Error(
                    `Invalid releaseDate in ${VERSION_FILE}: ${String(dateRaw)}`,
                )
            }

            return {
                key: 'sde',
                buildNumber,
                releaseDate,
            }
        }
    }

    throw new Error(
        `Can not find any valid version information in ${VERSION_FILE}`,
    )
}

export async function getDbVersion(): Promise<SdeVersion | null> {
    const v = await prisma.version.findUnique({ where: { key: 'sde' } })
    return v
        ? { key: 'sde', buildNumber: v.buildNumber, releaseDate: v.releaseDate }
        : null
}

export async function upsertDbVersion(v: SdeVersion) {
    await prisma.version.upsert({
        where: { key: 'sde' },
        create: {
            key: 'sde',
            buildNumber: v.buildNumber,
            releaseDate: v.releaseDate,
        },
        update: {
            buildNumber: v.buildNumber,
            releaseDate: v.releaseDate,
        },
    })
}
