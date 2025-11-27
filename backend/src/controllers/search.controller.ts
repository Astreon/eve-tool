/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

import { Request, Response, NextFunction } from 'express'
import { searchEsi } from '../services/esi/search.service.js'
import { BadRequestError } from '../types/appError.js'
import { ApiResponse } from '../types/apiResponse.js'
import { esiApi } from '../lib/axios.js'
import { extractCharacterIdFromJwt } from '../utils/jwt.js'
import type { EsiSearchCategories } from '../types/esi/search.types.js'

interface SearchItem {
    id: number
    name?: string
}

export type SearchResultData = Record<string, SearchItem[]>

export interface SearchMeta {
    query: string
    categories: EsiSearchCategories[]
    strict: boolean
    timestamp: string
}

const ALLOWED_CATEGORIES: readonly EsiSearchCategories[] = [
    'character',
    'solar_system',
    // expand here if needed
]

interface RequestWithEsiToken extends Request {
    esiAccessToken?: string
}

async function resolveNames(ids: number[]) {
    if (!ids.length) return []

    const res = await esiApi.post('/universe/names', ids, {
        validateStatus: (s) => s === 200 || s === 404,
    })
    if (res.status === 404) return []
    return res.data as Array<{ id: number; name: string; category: string }>
}

export async function searchAll(
    req: Request,
    res: Response<ApiResponse<SearchResultData, SearchMeta>>,
    next: NextFunction,
) {
    try {
        const q = String(req.query.query ?? '').trim()
        if (!q) {
            next(new BadRequestError('Missing ?query'))
            return
        }

        const rawCategories = String(req.query.categories ?? 'character')
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)

        const strict =
            String(req.query.strict ?? 'false').toLowerCase() === 'true'

        const reqWithToken = req as RequestWithEsiToken
        const token = reqWithToken.esiAccessToken
        if (!token) {
            next(new BadRequestError('Missing Bearer token'))
            return
        }

        const cidParam = req.query.character_id
            ? Number(req.query.character_id)
            : undefined

        let characterId = extractCharacterIdFromJwt(token) ?? 0

        if (
            typeof cidParam === 'number' &&
            Number.isFinite(cidParam) &&
            cidParam > 0
        ) {
            characterId = cidParam
        }

        if (!characterId) {
            next(
                new BadRequestError(
                    'Missing character_id (and could not derive from token)',
                ),
            )
            return
        }

        const categories = rawCategories.filter((c): c is EsiSearchCategories =>
            (ALLOWED_CATEGORIES as readonly string[]).includes(c),
        )

        if (!categories.length) {
            next(
                new BadRequestError(
                    `Invalid ?categories. Allowed: ${ALLOWED_CATEGORIES.join(', ')}`,
                ),
            )
            return
        }

        const result = await searchEsi(
            token,
            characterId,
            q,
            categories,
            strict,
        )

        const out: SearchResultData = {}
        for (const [cat, ids] of Object.entries(result) as [
            string,
            number[],
        ][]) {
            out[cat] = (ids ?? []).map((id) => ({ id }))
        }

        const charIds = result.characters ?? []
        if (charIds.length) {
            try {
                const named = await resolveNames(charIds)
                const byId = new Map<number, string>()
                for (const n of named) {
                    if (n.category === 'character') {
                        byId.set(n.id, n.name)
                    }
                }
                out.characters = charIds.map((id) => ({
                    id,
                    name: byId.get(id),
                }))
            } catch {
                // we don't want to fail the whole search if this fails
            }
        }

        const meta: SearchMeta = {
            query: q,
            categories,
            strict,
            timestamp: new Date().toISOString(),
        }

        res.json({
            success: true,
            data: out,
            meta,
        })
    } catch (e) {
        next(e)
    }
}
