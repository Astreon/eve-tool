import {Request, Response, NextFunction} from "express";
import {prisma} from "../lib/prisma.js";
import {redis} from "../lib/redis.js";
import config from "../config/config.js";
import {CACHE_THRESHOLDS} from "../config/cacheThresholds.js";

import type {ApiResponse} from "../types/apiResponse.js";
import type {RegionApiResponse} from "../types/api/region.types.js";

const KNOWN_SPACE_MIN_ID = 10000000
const KNOWN_SPACE_MAX_ID = 10999999

function getRegionsCacheKey(knownSpaceOnly: boolean) {
    const v = config.redis.cacheVersion
    const scope = knownSpaceOnly ? "known" : "all"
    return `regions:${v}:${scope}`
}

export async function getRegions(req: Request, res: Response<ApiResponse<RegionApiResponse[]>>, next: NextFunction) {
    try {
        // optional: ?knownSpaceOnly=false (Default: true)
        const knownSpaceOnly = req.query.knownSpaceOnly !== 'false' && req.query.knownSpaceOnly !== '0'

        const cacheKey = getRegionsCacheKey(knownSpaceOnly)

        // 1) Redis Fast-Path
        const cachedStr = await redis.get(cacheKey);
        if (cachedStr) {
            const data: RegionApiResponse[] = JSON.parse(cachedStr);
            const ttl = await redis.ttl(cacheKey); // number, kann -1/-2 sein

            return res.json({
                success: true,
                data,
                meta: {
                    source: "redis",
                    ...(ttl >= 0 ? {ttl} : {}),
                },
            });
        }

        // 2) DB Wuery
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
            include: {faction: true},
            orderBy: {id: 'asc'},
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

        await redis.set(cacheKey, JSON.stringify(data), "EX", ttlSec);

        return res.json({
            success: true,
            data,
            meta: {
                source: "db",
                ttl: ttlSec,
            },
        });
    } catch (err) {
        return next(err)
    }
}