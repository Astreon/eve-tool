/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

import * as path from 'path'
import { promises as fs } from 'fs'
import { prisma } from '../lib/prisma.js'
import { logger } from '../lib/logger.js'

const LAYOUT_SEED_DIR = path.resolve('layouts')
const DEFAULT_LAYOUT_MODE = 'optimized' as const

type LayoutMode = string

interface LayoutSeedSystem {
    systemId: number
    x: number
    y: number
    isLocked?: boolean
    layoutMode?: LayoutMode
}

interface LayoutSeedFile {
    regionId: number
    layoutMode?: LayoutMode
    systems: LayoutSeedSystem[]
}

// --- Import
export async function importMapLayouts(opts?: {
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
                { dir: LAYOUT_SEED_DIR },
                'Layout seed directory does not exist (nothing to import)',
            )
            return
        }

        throw err
    }

    const jsonFiles = files.filter((f) => f.endsWith('.json'))

    if (jsonFiles.length === 0) {
        logger.warn(
            { dir: LAYOUT_SEED_DIR },
            'No *.json layout seed files found (nothing to import)',
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
                { file: fullPath, err },
                'Failed to parse layout seed file',
            )
            continue
        }

        const regionId = parsed.regionId
        if (!regionId || !Number.isFinite(regionId)) {
            logger.warn(
                { file: fullPath },
                'Seed file has no valid regionId, skipping',
            )
            continue
        }

        if (regionFilter != null && regionId !== regionFilter) {
            continue
        }

        const fileLayoutMode = parsed.layoutMode ?? layoutMode
        const rows = parsed.systems ?? []

        if (rows.length === 0) {
            logger.warn(
                { file: fullPath, regionId },
                'Seed file has no systems, skipping',
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
            {
                file: path.relative(process.cwd(), fullPath),
                regionId,
                systems: rows.length,
                layoutMode: fileLayoutMode,
                truncateExisting,
            },
            'Imported layout seed',
        )
    }
}

// --- Export
export async function exportMapLayouts(opts?: {
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
            {
                regionId: regionFilter ?? 'ALL',
                layoutMode,
            },
            'No region layouts found for export',
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
            {
                regionId,
                systems: regionRows.length,
                file: path.relative(process.cwd(), filePath),
                layoutMode,
            },
            'Exported region layout',
        )
    }
}
