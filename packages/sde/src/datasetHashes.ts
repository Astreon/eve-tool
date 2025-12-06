/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

import * as fs from 'fs'
import * as path from 'path'
import { createHash } from 'crypto'
import { SDE_DIR } from './config'
import { sdePrisma } from './lib/prisma'
import { sdeLogger } from './lib/logger'

export const DATASET_FILES = {
    bloodlines: 'bloodlines.jsonl',
    factions: 'factions.jsonl',
    asteroidbelts: 'mapAsteroidBelts.jsonl',
    constellations: 'mapConstellations.jsonl',
    moons: 'mapMoons.jsonl',
    planets: 'mapPlanets.jsonl',
    regions: 'mapRegions.jsonl',
    solarsystems: 'mapSolarSystems.jsonl',
    stargates: 'mapStargates.jsonl',
    stars: 'mapStars.jsonl',
    npcstations: 'npcStations.jsonl',
    races: 'races.jsonl',
    stationoperations: 'stationOperations.jsonl',
    stationservices: 'stationServices.jsonl',
    types: 'types.jsonl',
} as const

export type DatasetId = keyof typeof DATASET_FILES

export async function computeDatasetFileHash(
    datasetId: DatasetId,
): Promise<{ fileName: string; fileHash: string } | null> {
    const fileName = DATASET_FILES[datasetId]
    const fullPath = path.join(SDE_DIR, fileName)

    if (!fs.existsSync(fullPath)) {
        sdeLogger.warn(
            `[SDE] Dataset "${datasetId}" – File "${fileName}" not found in (${fullPath}).`,
        )
        return null
    }

    const hash = createHash('sha256')

    await new Promise<void>((resolve, reject) => {
        const stream = fs.createReadStream(fullPath)
        stream.on('error', (err) => reject(err))
        stream.on('data', (chunk) => hash.update(chunk))
        stream.on('end', () => resolve())
    })

    return {
        fileName,
        fileHash: hash.digest('hex'),
    }
}

export async function getStoredDatasetVersion(datasetId: DatasetId) {
    return sdePrisma.versionDataset.findUnique({
        where: { id: datasetId },
    })
}

export async function upsertDatasetVersion(params: {
    datasetId: DatasetId
    fileName: string
    fileHash: string
}) {
    const { datasetId, fileName, fileHash } = params

    await sdePrisma.versionDataset.upsert({
        where: { id: datasetId },
        create: { id: datasetId, fileName, fileHash },
        update: { fileName, fileHash },
    })
}

export async function getDatasetsNeedingImport(
    datasetIds: DatasetId[],
): Promise<DatasetId[]> {
    const toImport: DatasetId[] = []

    for (const id of datasetIds) {
        const hashInfo = await computeDatasetFileHash(id)
        if (!hashInfo) continue

        const stored = await getStoredDatasetVersion(id)
        if (!stored || stored.fileHash !== hashInfo.fileHash) {
            toImport.push(id)
        }
    }

    return toImport
}

export async function markDatasetAsImported(datasetId: DatasetId) {
    const hashInfo = await computeDatasetFileHash(datasetId)
    if (!hashInfo) return

    await upsertDatasetVersion({
        datasetId,
        fileName: hashInfo.fileName,
        fileHash: hashInfo.fileHash,
    })
}
