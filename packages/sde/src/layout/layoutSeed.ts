/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

import * as path from 'path'
import { promises as fs } from 'fs'
import { logger } from '../lib/logger'
import { prisma } from '../lib/prisma'

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

// --- Import
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
            logger.warn(
                `📁 Layout seed directory does not exist: ${LAYOUT_SEED_DIR} (nothing to import)`,
            )
            return
        }
        throw err
    }

    const jsonFiles = files.filter((f) => f.endsWith('.json'))
    if (jsonFiles.length === 0) {
        logger.warn(
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
            logger.error(
                {
                    error: err instanceof Error ? err.message : String(err),
                },
                `❌ Failed to parse layout seed file ${fullPath}:`,
            )
            continue
        }

        const regionId = parsed.regionId
        if (!Number.isFinite(regionId)) {
            logger.warn(`⚠️ Seed file ${file} has no valid regionId, skipping`)
            continue
        }

        if (regionFilter != null && regionId !== regionFilter) {
            continue
        }

        const fileLayoutMode = parsed.layoutMode ?? layoutMode
        const rows = parsed.systems ?? []

        if (rows.length === 0) {
            logger.warn(
                `⚠️ Seed file ${file} for region ${regionId} has no systems, skipping`,
            )
            continue
        }

        if (truncateExisting) {
            await prisma.regionSystemLayout.deleteMany({
                where: {
                    mapRegionId: regionId,
                    layoutMode: fileLayoutMode,
                },
            })
        }

        await prisma.regionSystemLayout.createMany({
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

        logger.info(
            `📥 Imported layout seed for region ${regionId} (${rows.length} systems, mode=${fileLayoutMode})`,
        )
    }
}

// --- Export
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

    const rows = await prisma.regionSystemLayout.findMany({
        where,
        orderBy: [{ mapRegionId: 'asc' }, { systemId: 'asc' }],
    })

    if (rows.length === 0) {
        logger.warn(
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

        logger.info(
            `💾 Exported layout for region ${regionId} (${regionRows.length} systems) -> ${path.relative(
                process.cwd(),
                filePath,
            )}`,
        )
    }
}
