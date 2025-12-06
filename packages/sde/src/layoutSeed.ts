/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

import { promises as fs } from 'node:fs'
import * as path from 'node:path'

import { sdePrisma } from './lib/prisma.js'
import { sdeRedis } from './lib/redis.js'
import { sdeLogger } from './lib/logger.js'

const LAYOUT_SEED_DIR = path.resolve('sde', 'seed', 'layouts')
const DEFAULT_LAYOUT_MODE = 'optimized' as const

type LayoutMode = string

type LayoutSeedEntry = {
    systemId: number
    x: number
    y: number
    isLocked?: boolean
    layoutMode?: LayoutMode
}

type LayoutSeedFile = {
    regionId: number
    layoutMode?: LayoutMode
    systems: LayoutSeedEntry[]
}

// --- EXPORT
export async function exportLayouts(opts?: {
    regionId?: number
    layoutMode?: LayoutMode
}): Promise<void> {
    const regionFilter = opts?.regionId
    const layoutMode = opts?.layoutMode ?? DEFAULT_LAYOUT_MODE

    await fs.mkdir(LAYOUT_SEED_DIR, { recursive: true })

    const where: Record<string, unknown> = {
        layoutMode,
    }

    if (regionFilter != null) {
        where.mapRegionId = regionFilter
    }

    const rows = await sdePrisma.regionSystemLayout.findMany({
        where,
        orderBy: [{ mapRegionId: 'asc' }, { systemId: 'asc' }],
    })

    if (rows.length === 0) {
        sdeLogger.warn(
            `🧭 No region layouts found for export (regionId=${regionFilter ?? 'ALL'}, layoutMode=${layoutMode})`,
        )
        return
    }

    type LayoutRow = (typeof rows)[number]
    const byRegion: Record<number, LayoutRow[]> = {}

    for (const row of rows) {
        const key = row.mapRegionId
        if (!byRegion[key]) {
            byRegion[key] = []
        }
        byRegion[key].push(row)
    }

    for (const regionIdStr of Object.keys(byRegion)) {
        const regionId = Number(regionIdStr)
        const regionRows = byRegion[regionId]

        const seed: LayoutSeedFile = {
            regionId,
            layoutMode,
            systems: regionRows.map((r) => ({
                systemId: r.systemId,
                x: r.x,
                y: r.y,
                isLocked: r.isLocked ?? true,
                layoutMode: r.layoutMode,
            })),
        }

        const filePath = path.join(LAYOUT_SEED_DIR, `${regionId}.json`)
        await fs.writeFile(
            filePath,
            JSON.stringify(seed, null, 2) + '\n',
            'utf8',
        )

        sdeLogger.info(
            `💾 Exported layout for region ${regionId} (${regionRows.length} systems) -> ${path.relative(
                process.cwd(),
                filePath,
            )}`,
        )
    }
}

// --- IMPORT
export async function importLayouts(opts?: {
    regionId?: number
    layoutMode?: LayoutMode
    truncateExisting?: boolean
}): Promise<void> {
    const regionFilter = opts?.regionId
    const layoutMode = opts?.layoutMode ?? DEFAULT_LAYOUT_MODE
    const truncateExisting = opts?.truncateExisting ?? true

    let files: string[]
    try {
        files = await fs.readdir(LAYOUT_SEED_DIR)
    } catch (err: any) {
        if (err?.code === 'ENOENT') {
            sdeLogger.warn(
                `📁 Layout seed directory does not exist: ${LAYOUT_SEED_DIR} (nothing to import)`,
            )
            return
        }
        throw err
    }

    const jsonFiles = files.filter((f) => f.endsWith('.json'))
    if (jsonFiles.length === 0) {
        sdeLogger.warn(
            `📁 No *.json layout seed files found in ${LAYOUT_SEED_DIR} (nothing to import)`,
        )
        return
    }

    for (const file of jsonFiles) {
        const fullPath = path.join(LAYOUT_SEED_DIR, file)
        const raw = await fs.readFile(fullPath, 'utf8')

        let parsed: LayoutSeedFile
        try {
            parsed = JSON.parse(raw) as LayoutSeedFile
        } catch (err) {
            sdeLogger.error(
                `❌ Failed to parse layout seed file ${fullPath}:`,
                err,
            )
            continue
        }

        const regionId = parsed.regionId
        if (!Number.isFinite(regionId)) {
            sdeLogger.warn(
                `⚠️ Seed file ${file} has no valid regionId, skipping`,
            )
            continue
        }

        if (regionFilter != null && regionId !== regionFilter) {
            continue
        }

        const fileLayoutMode = parsed.layoutMode ?? layoutMode
        const rows = parsed.systems ?? []

        if (rows.length === 0) {
            sdeLogger.warn(
                `⚠️ Seed file ${file} for region ${regionId} has no systems, skipping`,
            )
            continue
        }

        if (truncateExisting) {
            await sdePrisma.regionSystemLayout.deleteMany({
                where: {
                    mapRegionId: regionId,
                    layoutMode: fileLayoutMode,
                },
            })
        }

        await sdePrisma.regionSystemLayout.createMany({
            data: rows.map((s) => ({
                mapRegionId: regionId,
                systemId: s.systemId,
                x: s.x,
                y: s.y,
                layoutMode: s.layoutMode ?? fileLayoutMode,
                isLocked: s.isLocked ?? true,
            })),
            skipDuplicates: true,
        })

        sdeLogger.info(
            `📥 Imported layout seed for region ${regionId} (${rows.length} systems, mode=${fileLayoutMode})`,
        )
    }
}

// --- CLI Wrapper
type LayoutCommand = 'export' | 'import'

function parseCliArgs(): {
    command: LayoutCommand
    regionId?: number
    layoutMode?: LayoutMode
} {
    const [, , ...argv] = process.argv

    const first = (argv[0] ?? 'export').toLowerCase()
    let command: LayoutCommand

    switch (first) {
        case 'export':
        case 'import':
            command = first
            break
        default:
            command = 'export'
            break
    }

    let regionId: number | undefined
    let layoutMode: LayoutMode | undefined

    for (const arg of argv.slice(1)) {
        if (/^\d+$/.test(arg)) {
            regionId = Number(arg)
            continue
        }

        if (arg.startsWith('--region=')) {
            regionId = Number(arg.slice('--region='.length))
            continue
        }

        if (arg.startsWith('--layout=')) {
            layoutMode = arg.slice('--layout='.length)
        }
    }

    return { command, regionId, layoutMode }
}

;(async () => {
    const { command, regionId, layoutMode } = parseCliArgs()

    try {
        if (command === 'export') {
            sdeLogger.info('🧭 SDE Layouts – EXPORT')
            await exportLayouts({ regionId, layoutMode })
            sdeLogger.info('✅ Layout export finished.')
            return
        }

        if (command === 'import') {
            sdeLogger.info('🧭 SDE Layouts – IMPORT from seed')
            await importLayouts({ regionId, layoutMode })
            sdeLogger.info('✅ Layout import finished.')
            return
        }
    } catch (err) {
        sdeLogger.error('❌ Layout seed command failed:', err)
        process.exitCode = 1
    } finally {
        try {
            await sdePrisma.$disconnect()
        } catch {
            // ignore
        }

        try {
            await sdeRedis.quit()
        } catch {
            // ignore
        }
    }
})()

if (process.argv[1]?.endsWith('layoutSeed.ts')) {
    const cmd = process.argv[2]
    if (cmd === 'export') {
        exportLayouts().catch((err) => {
            console.error(err)
            process.exit(1)
        })
    } else if (cmd === 'import') {
        importLayouts().catch((err) => {
            console.error(err)
            process.exit(1)
        })
    } else {
        console.error('Usage: layoutSeed.ts [export|import]')
        process.exit(1)
    }
}
