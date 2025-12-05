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
                _count: {
                    select: {
                        planets: true,
                        moons: true,
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
            shipKills: null,
            podKills: null,
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
            },
            activity: {
                window: 'last_hour',
                jumps: activity.jumps,
                npcKills: activity.npcKills,
                shipKills: activity.shipKills,
                podKills: activity.podKills,
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
