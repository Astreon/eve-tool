/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

import { Request, Response, NextFunction } from 'express'
import { prisma } from '../lib/prisma.js'
import { redis } from '../lib/redis.js'
import config from '../config/config.js'
import { CACHE_THRESHOLDS } from '../config/cacheThresholds.js'
import { parseNumericIdFromParams } from '../utils/params.js'
import { BadRequestError, NotFoundError } from '../types/appError.js'

import type { ApiResponse } from '../types/apiResponse.js'
import type {
    RegionApiResponse,
    RegionLinkApi,
    RegionGraphApiResponse,
    RegionMapApiResponse,
    RegionSystemNode,
    RegionSystemEdge,
    SystemBorderType,
    RegionMapLayoutMode,
    UpdateRegionSystemLayoutRequest,
    RegionSystemLayoutApi,
} from '../types/api/region.types.js'

const KNOWN_SPACE_MIN_ID = 10000000
const KNOWN_SPACE_MAX_ID = 10999999

function getRegionsCacheKey(knownSpaceOnly: boolean) {
    const v = config.redis.cacheVersion
    const scope = knownSpaceOnly ? 'known' : 'all'
    return `regions:${v}:list:${scope}`
}

function getRegionGraphCacheKey(knownSpaceOnly: boolean) {
    const v = config.redis.cacheVersion
    const scope = knownSpaceOnly ? 'known' : 'all'
    return `regions:${v}:graph:${scope}`
}

function getRegionMapCacheKey(regionId: number) {
    const v = config.redis.cacheVersion
    return `regions:${v}:region:${regionId}`
}

export async function getRegionGraph(
    req: Request,
    res: Response<ApiResponse<RegionGraphApiResponse>>,
    next: NextFunction,
) {
    try {
        // optional: ?knownSpaceOnly=false (Default: true)
        const knownSpaceOnly =
            req.query.knownSpaceOnly !== 'false' &&
            req.query.knownSpaceOnly !== '0'

        const cacheKey = getRegionGraphCacheKey(knownSpaceOnly)
        const ttl = CACHE_THRESHOLDS.REGIONS

        // 1) Redis-Fastpath
        const cachedStr = await redis.get(cacheKey)
        if (cachedStr) {
            const data = JSON.parse(
                cachedStr,
            ) as unknown as RegionGraphApiResponse

            return res.json({
                success: true,
                data,
                meta: {
                    source: 'redis',
                    ttl,
                    knownSpaceOnly,
                    timestamp: new Date().toISOString(),
                },
            })
        }

        // 2) Regions from DB
        const where = knownSpaceOnly
            ? {
                  id: {
                      gte: KNOWN_SPACE_MIN_ID,
                      lte: KNOWN_SPACE_MAX_ID,
                  },
              }
            : {}

        const regions = await prisma.region.findMany({
            where,
            include: { faction: true },
            orderBy: { id: 'asc' },
        })

        const regionIds = new Set(regions.map((r) => r.id))

        // 3) Links from DB (RegionLink)
        const linkRows = await prisma.regionLink.findMany({
            select: {
                fromRegionId: true,
                toRegionId: true,
            },
        })

        const links: RegionLinkApi[] = linkRows
            .filter(
                (l) =>
                    regionIds.has(l.fromRegionId) &&
                    regionIds.has(l.toRegionId),
            )
            .map((l) => ({
                fromRegionId: l.fromRegionId,
                toRegionId: l.toRegionId,
            }))

        const nodes: RegionApiResponse[] = regions.map((r) => ({
            id: r.id,
            name: r.name,
            x: r.x,
            y: r.y,
            z: r.z,
            faction: r.faction
                ? {
                      id: r.faction.id,
                      name: r.faction.name,
                  }
                : null,
        }))

        const data: RegionGraphApiResponse = {
            regions: nodes,
            links,
        }

        await redis.set(cacheKey, JSON.stringify(data), 'EX', ttl)

        return res.json({
            success: true,
            data,
            meta: {
                source: 'db',
                ttl,
                knownSpaceOnly,
                regionCount: regions.length,
                linkCount: links.length,
                timestamp: new Date().toISOString(),
            },
        })
    } catch (err) {
        next(err)
        return
    }
}

const parseRegionId = parseNumericIdFromParams('regionId', {
    min: KNOWN_SPACE_MIN_ID,
    max: KNOWN_SPACE_MAX_ID,
    notFoundIfOutOfRange: true,
})

export async function getRegionMap(
    req: Request,
    res: Response<ApiResponse<RegionMapApiResponse>>,
    next: NextFunction,
) {
    try {
        const regionId = parseRegionId(req)
        const cacheKey = getRegionMapCacheKey(regionId)
        const ttl = CACHE_THRESHOLDS.REGIONS

        // 1) Redis-Fastpath
        const cachedStr = await redis.get(cacheKey)
        if (cachedStr) {
            const data = JSON.parse(
                cachedStr,
            ) as unknown as RegionMapApiResponse

            return res.json({
                success: true,
                data,
                meta: {
                    source: 'redis',
                    ttl,
                    regionId,
                    timestamp: new Date().toISOString(),
                },
            })
        }

        // 2) Region from DB
        const region = await prisma.region.findUnique({
            where: { id: regionId },
            include: { faction: true },
        })

        if (!region) {
            throw new NotFoundError(`Region ${regionId} not found`)
        }

        // 3) Systems in this Region from DB
        const systems = await prisma.solarSystem.findMany({
            where: { regionId },
            select: {
                id: true,
                name: true,
                x: true,
                y: true,
                z: true,
                constellationId: true,
                regionId: true,
            },
            orderBy: { name: 'asc' },
        })

        const systemIds = systems.map((s) => s.id)

        let edges: RegionSystemEdge[] = []
        let foreignSystems: {
            id: number
            name: string
            x: number
            y: number
            z: number
            constellationId: number
            regionId: number
            region: { name: string }
        }[] = []

        const layoutBySystemId = new Map<
            number,
            { x: number; y: number; layoutMode: RegionMapLayoutMode }
        >()

        if (systemIds.length > 0) {
            // 4) SystemLinks, both Systems in the same Region
            const links = await prisma.systemLink.findMany({
                where: {
                    OR: [
                        { fromSystemId: { in: systemIds } },
                        { toSystemId: { in: systemIds } },
                    ],
                },
                select: {
                    fromSystemId: true,
                    toSystemId: true,
                    borderType: true,
                },
            })

            const linkedSystemIdSet = new Set<number>()
            for (const l of links) {
                linkedSystemIdSet.add(l.fromSystemId)
                linkedSystemIdSet.add(l.toSystemId)
            }

            const foreignIds = Array.from(linkedSystemIdSet).filter(
                (id) => !systemIds.includes(id),
            )

            if (foreignIds.length > 0) {
                foreignSystems = await prisma.solarSystem.findMany({
                    where: { id: { in: foreignIds } },
                    select: {
                        id: true,
                        name: true,
                        x: true,
                        y: true,
                        z: true,
                        constellationId: true,
                        regionId: true,
                        region: {
                            select: { name: true },
                        },
                    },
                })
            }

            edges = links.map((l) => ({
                fromSystemId: l.fromSystemId,
                toSystemId: l.toSystemId,
                borderType: l.borderType as SystemBorderType,
            }))
        }

        // 5) Load layout data (for local and foreign systems)
        const layoutSystemIds = [
            ...systemIds,
            ...foreignSystems.map((s) => s.id),
        ]

        if (layoutSystemIds.length > 0) {
            const layoutRows = await prisma.regionSystemLayout.findMany({
                where: {
                    mapRegionId: regionId,
                    systemId: { in: layoutSystemIds },
                },
                select: {
                    mapRegionId: true,
                    systemId: true,
                    layoutMode: true,
                    x: true,
                    y: true,
                },
            })

            for (const row of layoutRows) {
                const mode = row.layoutMode as RegionMapLayoutMode
                const existing = layoutBySystemId.get(row.systemId)

                if (!existing) {
                    layoutBySystemId.set(row.systemId, {
                        x: row.x,
                        y: row.y,
                        layoutMode: mode,
                    })
                    continue
                }

                if (
                    mode === 'optimized' &&
                    existing.layoutMode !== 'optimized'
                ) {
                    layoutBySystemId.set(row.systemId, {
                        x: row.x,
                        y: row.y,
                        layoutMode: mode,
                    })
                }
            }
        }

        // 6) Nodes (lokal + foreign) inkl. Layout-Feldern
        const localNodes: RegionSystemNode[] = systems.map((s) => {
            const layout = layoutBySystemId.get(s.id)
            return {
                id: s.id,
                name: s.name,
                x: s.x,
                y: s.y,
                z: s.z,
                constellationId: s.constellationId,
                regionId: regionId,
                regionName: region.name,
                isForeign: false,
                layoutX: layout?.x ?? null,
                layoutY: layout?.y ?? null,
                layoutMode: layout?.layoutMode ?? null,
            }
        })

        const foreignNodes: RegionSystemNode[] = foreignSystems.map((s) => {
            const layout = layoutBySystemId.get(s.id)
            return {
                id: s.id,
                name: s.name,
                x: s.x,
                y: s.y,
                z: s.z,
                constellationId: s.constellationId,
                regionId: s.regionId,
                regionName: s.region.name,
                isForeign: true,
                layoutX: layout?.x ?? null,
                layoutY: layout?.y ?? null,
                layoutMode: layout?.layoutMode ?? null,
            }
        })

        const systemNodes = [...localNodes, ...foreignNodes]

        const regionNode: RegionApiResponse = {
            id: region.id,
            name: region.name,
            x: region.x,
            y: region.y,
            z: region.z,
            faction: region.faction
                ? {
                      id: region.faction.id,
                      name: region.faction.name,
                  }
                : null,
        }

        const data: RegionMapApiResponse = {
            region: regionNode,
            systems: systemNodes,
            edges,
        }

        await redis.set(cacheKey, JSON.stringify(data), 'EX', ttl)

        return res.json({
            success: true,
            data,
            meta: {
                source: 'db',
                ttl,
                regionId,
                systemCount: systems.length,
                foreignSystemCount: systemNodes.length - systems.length,
                edgeCount: edges.length,
                timestamp: new Date().toISOString(),
            },
        })
    } catch (err) {
        next(err)
        return
    }
}

export async function updateRegionLayout(
    req: Request,
    res: Response<ApiResponse<RegionSystemLayoutApi>>,
    next: NextFunction,
) {
    try {
        const regionId = parseRegionId(req)

        const body = req.body as Partial<UpdateRegionSystemLayoutRequest>
        const systemId = Number(body.systemId)
        const x = Number(body.x)
        const y = Number(body.y)
        const layoutMode: RegionMapLayoutMode = body.layoutMode ?? 'optimized'

        if (
            !Number.isFinite(systemId) ||
            !Number.isFinite(x) ||
            !Number.isFinite(y)
        ) {
            throw new BadRequestError('Invalid layout payload', {
                systemId: body.systemId,
                x: body.x,
                y: body.y,
            })
        }

        const system = await prisma.solarSystem.findUnique({
            where: { id: systemId },
            select: { id: true },
        })

        if (!system) {
            throw new NotFoundError(`Solar system ${systemId} not found`)
        }

        const row = await prisma.regionSystemLayout.upsert({
            where: {
                mapRegionId_systemId_layoutMode: {
                    mapRegionId: regionId,
                    systemId,
                    layoutMode,
                },
            },
            create: {
                mapRegionId: regionId,
                systemId,
                layoutMode,
                x,
                y,
                isLocked: true,
            },
            update: {
                x,
                y,
                isLocked: true,
            },
        })

        await redis.del(getRegionMapCacheKey(regionId))

        const data: RegionSystemLayoutApi = {
            regionId,
            systemId: row.systemId,
            x: row.x,
            y: row.y,
            layoutMode: row.layoutMode as RegionMapLayoutMode,
        }

        return res.json({
            success: true,
            data,
        })
    } catch (err) {
        next(err)
        return
    }
}

export async function getRegions(
    req: Request,
    res: Response<ApiResponse<RegionApiResponse[]>>,
    next: NextFunction,
) {
    try {
        // optional: ?knownSpaceOnly=false (Default: true)
        const knownSpaceOnly =
            req.query.knownSpaceOnly !== 'false' &&
            req.query.knownSpaceOnly !== '0'

        const cacheKey = getRegionsCacheKey(knownSpaceOnly)

        // 1) Redis Fast-Path
        const cachedStr = await redis.get(cacheKey)
        if (cachedStr) {
            const data = JSON.parse(cachedStr) as unknown as RegionApiResponse[]
            const ttl = await redis.ttl(cacheKey) // number, kann -1/-2 sein

            return res.json({
                success: true,
                data,
                meta: {
                    source: 'redis',
                    ...(ttl >= 0 ? { ttl } : {}),
                    knownSpaceOnly,
                    timestamp: new Date().toISOString(),
                },
            })
        }

        // 2) DB Query
        const where = knownSpaceOnly
            ? {
                  id: {
                      gte: KNOWN_SPACE_MIN_ID,
                      lte: KNOWN_SPACE_MAX_ID,
                  },
              }
            : {}

        const regions = await prisma.region.findMany({
            where,
            include: { faction: true },
            orderBy: { id: 'asc' },
        })

        const data: RegionApiResponse[] = regions.map((r) => ({
            id: r.id,
            name: r.name,
            x: r.x,
            y: r.y,
            z: r.z,
            faction: r.faction
                ? {
                      id: r.faction.id,
                      name: r.faction.name,
                  }
                : null,
        }))

        // 3) Caching
        const ttlSec = CACHE_THRESHOLDS.REGIONS

        await redis.set(cacheKey, JSON.stringify(data), 'EX', ttlSec)

        return res.json({
            success: true,
            data,
            meta: {
                source: 'db',
                ttl: ttlSec,
                knownSpaceOnly,
                timestamp: new Date().toISOString(),
            },
        })
    } catch (err) {
        next(err)
        return
    }
}
