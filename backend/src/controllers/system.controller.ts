/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

import { Request, Response, NextFunction } from 'express'
import { prisma } from '../lib/prisma.js'
import { parseNumericIdFromParams } from '../utils/params.js'
import { NotFoundError } from '../types/appError.js'
import type { ApiSuccessResponse } from '../types/apiResponse.js'
import type {
    SystemOverviewApiResponse,
    SystemOverviewMeta,
} from '../types/api/system.types.js'
import { getSystemActivitySnapshot } from '../services/esi'

export async function getSystemOverview(
    req: Request,
    res: Response<
        ApiSuccessResponse<SystemOverviewApiResponse, SystemOverviewMeta>
    >,
    next: NextFunction,
) {
    try {
        const systemId = parseNumericIdFromParams('systemId', {
            min: 1,
            notFoundIfOutOfRange: true,
        })(req)

        const system = await prisma.solarSystem.findUnique({
            where: { id: systemId },
            include: {
                region: true,
                constellation: true,
                faction: true,
                star: {
                    include: {
                        type: {
                            select: { name: true },
                        },
                    },
                },
                _count: {
                    select: {
                        planets: true,
                        moons: true,
                        npcStations: true,
                        asteroidBelts: true,
                    },
                },
            },
        })

        if (!system) {
            throw new NotFoundError(`System ${systemId} not found`)
        }

        const snapshot = await getSystemActivitySnapshot()
        const activity = snapshot.data.get(systemId) ?? {
            systemId,
            jumps: null,
            npcKills: null,
            podKills: null,
            shipKills: null,
        }

        const since24 = new Date(Date.now() - 24 * 60 * 60 * 1000)
        const since48 = new Date(Date.now() - 48 * 60 * 60 * 1000)

        const [agg, samples] = await Promise.all([
            prisma.systemActivitySample.aggregate({
                where: {
                    systemId,
                    timestamp: { gte: since24 },
                },
                _sum: {
                    jumps: true,
                    npcKills: true,
                    shipKills: true,
                    podKills: true,
                },
            }),
            prisma.systemActivitySample.findMany({
                where: {
                    systemId,
                    timestamp: { gte: since48 },
                },
                orderBy: { timestamp: 'asc' },
            }),
        ])

        const last24h =
            agg._sum.jumps !== null
                ? {
                      jumps: agg._sum.jumps ?? 0,
                      npcKills: agg._sum.npcKills ?? 0,
                      podKills: agg._sum.podKills ?? 0,
                      shipKills: agg._sum.shipKills ?? 0,
                  }
                : undefined

        const timeline48h =
            samples.length > 0
                ? samples.map((s) => ({
                      timestamp: s.timestamp.toISOString(),
                      jumps: s.jumps,
                      npcKills: s.npcKills,
                      shipKills: s.shipKills,
                      podKills: s.podKills,
                  }))
                : undefined

        const starInfo = system.star
            ? {
                  spectralClass: system.star.spectralClass,
                  temperature: system.star.temperature,
                  radius: Number(system.star.radius),
                  typeName: system.star.type?.name ?? null,
              }
            : {
                  spectralClass: '',
                  temperature: 0,
                  radius: 0,
                  typeName: null,
              }

        const data: SystemOverviewApiResponse = {
            system: {
                id: system.id,
                name: system.name,
                securityStatus: system.securityStatus,
                securityClass: system.securityClass ?? null,
                region: {
                    id: system.region.id,
                    name: system.region.name,
                },
                constellation: {
                    id: system.constellation.id,
                    name: system.constellation.name,
                },
                faction: system.faction
                    ? {
                          id: system.faction.id,
                          name: system.faction.name,
                      }
                    : null,
                planetsCount: system._count.planets,
                moonsCount: system._count.moons,
                beltsCount: system._count.asteroidBelts,
                npcStationsCount: system._count.npcStations,
                star: starInfo,
            },
            activity: {
                window: 'last_hour',
                jumps: activity.jumps,
                npcKills: activity.npcKills,
                shipKills: activity.shipKills,
                podKills: activity.podKills,
                last24h,
                timeline48h,
            },
        }

        const meta: SystemOverviewMeta = {
            fetchedAt: new Date().toISOString(),
            ttlSeconds: snapshot.ttlSeconds,
        }

        res.json({
            success: true,
            data,
            meta,
        })
    } catch (err) {
        next(err)
    }
}
