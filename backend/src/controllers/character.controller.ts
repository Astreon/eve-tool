import {Request, Response, NextFunction} from 'express'
import {getCharacterInfo} from '../services/esi/index.js'
import {ApiResponse} from '../types/apiResponse.js'
import {EveCharacterExtended} from '../types/eve.types.js'
import {BadRequestError} from '../types/appError.js'
import {prisma} from "../lib/prisma.js";
import {z} from "zod";

export const getCharacter = async (
    req: Request,
    res: Response<ApiResponse<EveCharacterExtended>>,
    next: NextFunction,
) => {
    // Validation
    const characterIdSchema = z.coerce.number().int().min(90_000_000).max(2_129_999_999)
    const parseResult = characterIdSchema.safeParse(req.params.id)

    if (!parseResult.success) {
        return next(new BadRequestError('Invalid character ID'))
    }

    const id = parseResult.data

    try {
        // Check if character exist in db
        let character = await prisma.character.findUnique({
            where: {id},
            include: {
                race: true,
                bloodline: true,
            },
        })

        // Get character info from ESI and save
        if (!character) {
            const esiData = await getCharacterInfo(id)

            character = await prisma.character.create({
                data: {
                    id,
                    name: esiData.name,
                    bloodlineId: esiData.bloodline_id,
                    corporationId: esiData.corporation_id,
                    raceId: esiData.race_id,
                    securityStatus: Math.round(esiData.security_status)
                },
                include: {
                    race: true,
                    bloodline: true,
                }
            })
        }

        // Response with linked data
        res.json({
            success: true,
            data: {
                id: character.id,
                name: character.name,
                bloodline: character.bloodline?.name,
                corporation_id: character.corporationId,
                race: character.race?.name,
                security_status: character.securityStatus
            } as any,
        })
    } catch (err) {
        next(err)
    }
}