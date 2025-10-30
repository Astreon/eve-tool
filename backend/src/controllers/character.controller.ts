import {Request, Response, NextFunction} from 'express'
import {getCharacterInfo} from '../services/esi/index.js'
import {ApiResponse} from '../types/apiResponse.js'
import {BadRequestError, NotFoundError} from '../types/appError.js'
import {prisma} from "../lib/prisma.js";
import {z} from "zod";
import {redis} from "../lib/redis.js";
import {CharacterApiResponse} from "../types/api.types.js";
import {mapCharacterToApiResponse} from "../mappers/character.mapper.js";

export const getCharacter = async (
    req: Request,
    res: Response<ApiResponse<CharacterApiResponse>>,
    next: NextFunction,
) => {
    // Validation
    const characterIdSchema = z.coerce.number().int().min(90_000_000).max(2_129_999_999)
    const parseResult = characterIdSchema.safeParse(req.params.id)
    if (!parseResult.success) return next(new BadRequestError('Invalid character ID'))

    const id = parseResult.data

    try {
        // Check Redis-Cache
        const chached = await redis.get(`character:${id}`)
        if (chached) {
            const parsed: CharacterApiResponse = JSON.parse(chached)
            return res.json({success: true, data: parsed})
        }

        // Get ETag from Redis
        const etag = await redis.get(`etag:character:${id}`)

        // Call ESI with ETag
        const esi = await getCharacterInfo(id, etag)

        // If 304 then go to DB
        if (!esi.data) {
            const character = await prisma.character.findUnique({
                where: {id},
                include: {
                    race: true,
                    bloodline: true
                },
            })

            if (!character) return next(new NotFoundError(`Character not found`))

            const response = mapCharacterToApiResponse(character)
            await redis.set(`character:${id}`, JSON.stringify(response), 'EX', 60 * 60 * 24) //24h fallback TTL
            return res.json({success: true, data: response})
        }

        // Save ESI data to DB
        const character = await prisma.character.upsert({
            where: {id},
            update: {
                name: esi.data.name,
                bloodlineId: esi.data.bloodline_id,
                corporationId: esi.data.corporation_id,
                raceId: esi.data.race_id,
                securityStatus: Math.round(esi.data?.security_status ?? 0),
                lastUpdated: new Date(),
            },
            create: {
                id,
                name: esi.data.name,
                bloodlineId: esi.data.bloodline_id,
                corporationId: esi.data.corporation_id,
                raceId: esi.data.race_id,
                securityStatus: Math.round(esi.data?.security_status ?? 0),
            },
            include: {race: true, bloodline: true},
        })

        const response = mapCharacterToApiResponse(character)

        // Refresh Redis
        const ttl = esi.ttl ?? 60 * 60 * 24 // fallback TTL
        await redis.set(`character:${id}`, JSON.stringify(response), 'EX', ttl)
        if (esi.etag) await redis.set(`etag:character:${id}`, esi.etag)

        return res.json({success: true, data: response})
    } catch (err) {
        next(err)
    }
}