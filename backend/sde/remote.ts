import * as fs from "fs";
import * as path from 'path'
import {SDE_DIR} from "./config";
import {getDbVersion, type SdeVersion} from "./version";

const LATEST_META_URL = 'https://developers.eveonline.com/static-data/tranquility/latest.jsonl'

type LatestMetaRecord = {
    _key: string
    buildNumber: number
    releaseDate: string
    [key: string]: unknown
}

function getFetch(): (url: string) => Promise<any> {
    const fetchFn = (globalThis as any).fetch
    if (!fetchFn) throw new Error('Global fetch is not available. Run this script with Node.js 18+ or provide a fetch polyfill.')
    return fetchFn
}

export async function fetchRemoteSdeVersion(): Promise<SdeVersion> {
    const fetchFn = getFetch()
    const res = await fetchFn(LATEST_META_URL)

    if (!res.ok) throw new Error(`Failed to fetch latest.jsonl:${res.status} ${res.statusText}`)

    const text: string = await res.text()
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)

    for (const line of lines) {
        const obj = JSON.parse(line) as LatestMetaRecord
        if (obj._key === 'sde') {
            const buildNumber = Number(obj.buildNumber)
            if (!Number.isFinite(buildNumber)) throw new Error(`Invalid buildNumber in latest.jsonl: ${String(obj.buildNumber)}`)

            const dateRaw = obj.releaseDate
            const releaseDate = dateRaw ? new Date(dateRaw) : new Date()

            if (Number.isNaN(releaseDate.getTime())) throw new Error(`Invalid releaseDate in latest.jsonl: ${String(dateRaw)}`)

            return {key: 'sde', buildNumber, releaseDate}
        }
    }

    throw new Error('Could not find `_key: "sde"` entry in latest.jsonl')
}

async function clearSdeJsonlFiles(): Promise<void> {
    await fs.promises.mkdir(SDE_DIR, {recursive: true})
    const entries = await fs.promises.readdir(SDE_DIR, {withFileTypes: true})

    for (const entry of entries) {
        if (entry.isFile() && entry.name.endsWith('.jsonl')) {
            await fs.promises.rm(path.join(SDE_DIR, entry.name))
        }
    }
}

async function downloadSdeZip(buildNumber: number, downloadDir: string): Promise<string> {
    const fetchFn = getFetch()
    const zipUrl = `https://developers.eveonline.com/static-data/tranquility/eve-online-static-data-${buildNumber}-jsonl.zip`
    const zipPath = path.join(downloadDir, `eve-online-static-data-${buildNumber}-jsonl.zip`)

    console.log(`🌐 Downloading SDE from ${zipUrl}`)

    const res = await fetchFn(zipUrl)
    if (!res.ok) throw new Error(`Failed to download SDE zip: ${res.status} ${res.statusText}`)

    const arrayBuffer = await res.arrayBuffer()
    await fs.promises.mkdir(downloadDir, {recursive: true})
    await fs.promises.writeFile(zipPath, Buffer.from(arrayBuffer))

    return zipPath
}

async function findFileRecursive(rootDir: string, filename: string): Promise<string | null> {
    const entries = await fs.promises.readdir(rootDir, {withFileTypes: true})

    for (const entry of entries) {
        const full = path.join(rootDir, entry.name)
        if (entry.isDirectory()) {
            const found = await findFileRecursive(full, filename)
            if (found) return found
        } else if (entry.isFile() && entry.name === filename) {
            return full
        }
    }

    return null
}

async function copyJsonlFromExtractedTmp(tmpDir: string): Promise<void> {
    const expectedFiles = [
        '_sde.jsonl',
        'bloodlines.jsonl',
        'factions.jsonl',
        'mapConstellations.jsonl',
        'mapMoons.jsonl',
        'mapPlanets.jsonl',
        'mapRegions.jsonl',
        'mapSolarSystems.jsonl',
        'mapStargates.jsonl',
        'races.jsonl',
    ]

    await clearSdeJsonlFiles()

    for (const name of expectedFiles) {
        const found = await findFileRecursive(tmpDir, name)
        if (!found) {
            console.warn(`⚠️ Could not find ${name} in extracted SDE ZIP.`)
            continue
        }

        const target = path.join(SDE_DIR, name)
        await fs.promises.copyFile(found, target)
    }
}

async function extractZip(zipPath: string, targetDir: string): Promise<void> {
    const mod = await import('extract-zip')
    const extractFn = (mod as any).default ?? mod
    if (typeof extractFn !== 'function') {
        throw new Error(
            `extract-zip module did not export a function. Got: ${typeof extractFn}`,
        )
    }

    await extractFn(zipPath, {dir: targetDir})
}


export async function downloadAndPrepareSde(buildNumber: number): Promise<void> {
    const tmpDir = path.join(SDE_DIR, '.tmp-download')
    await fs.promises.rm(tmpDir, {recursive: true, force: true})
    await fs.promises.mkdir(tmpDir, {recursive: true})

    const zipPath = await downloadSdeZip(buildNumber, tmpDir)

    console.log('📦 Extracting SDE ZIP…')
    await extractZip(zipPath, tmpDir)

    await fs.promises.rm(zipPath, {force: true})

    console.log('📁 Copying JSONL files into .sde directory…')
    await copyJsonlFromExtractedTmp(tmpDir)

    await fs.promises.rm(tmpDir, {recursive: true, force: true})
}

export async function ensureLatestSdeOnDisk(): Promise<SdeVersion> {
    const remote = await fetchRemoteSdeVersion()
    const dbVersion = await getDbVersion()

    const versionFile = path.join(SDE_DIR, '_sde.jsonl')
    const hasLocalVersionFile = fs.existsSync(versionFile)

    if (dbVersion && dbVersion.buildNumber === remote.buildNumber && hasLocalVersionFile) {
        console.log(
            `🆗 SDE in DB already up to date (build ${dbVersion.buildNumber}, release ${dbVersion.releaseDate.toISOString()}).`,
        )
        return remote
    }

    if (dbVersion && dbVersion.buildNumber === remote.buildNumber && !hasLocalVersionFile) {
        console.log(
            '⚠️ DB has latest SDE version but local .sde folder is missing. Re-downloading SDE for this build…',
        )
    } else {
        console.log(
            `⬆️ New or missing SDE version detected. Remote build ${remote.buildNumber}, local build ${
                dbVersion?.buildNumber ?? 'none'
            }.`,
        )
    }

    await downloadAndPrepareSde(remote.buildNumber)

    console.log(`✅ Downloaded and prepared SDE build ${remote.buildNumber}.`)

    return remote
}