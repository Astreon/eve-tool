/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

import type { Request, Response } from 'express'
import { prisma } from '../lib/prisma.js'

export async function searchUniverseByName(req: Request, res: Response) {
    const raw = (req.query.query ?? '').toString().trim()

    if (!raw) {
        return res.json({
            success: true,
            data: {
                regions: [],
                solar_systems: [],
            },
            meta: {
                query: '',
                timestamp: new Date().toISOString(),
            },
        })
    }

    const query = raw

    const [regions, systems] = await Promise.all([
        prisma.region.findMany({
            where: {
                name: {
                    contains: query,
                    mode: 'insensitive',
                },
            },
            select: {
                id: true,
                name: true,
            },
            take: 10,
            orderBy: {
                name: 'asc',
            },
        }),
        prisma.solarSystem.findMany({
            where: {
                name: {
                    contains: query,
                    mode: 'insensitive',
                },
            },
            select: {
                id: true,
                name: true,
            },
            take: 10,
            orderBy: {
                name: 'asc',
            },
        }),
    ])

    return res.json({
        success: true,
        data: {
            regions: regions.map((r) => ({ id: r.id, name: r.name })),
            solar_systems: systems.map((s) => ({ id: s.id, name: s.name })),
        },
        meta: {
            query,
            timestamp: new Date().toISOString(),
        },
    })
}
