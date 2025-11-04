import {Request, Response, NextFunction} from 'express'
import {searchEsi} from '../services/esi/search.service.js'
import {BadRequestError} from '../types/appError.js'
import {ApiResponse} from '../types/apiResponse.js'
import {EsiSearchCategories, EsiSearchResult, SearchResultPlural} from "../types/esi/search.types.js";
import {z} from "zod";
import {esiApi} from "../lib/axios.js";

const ALL_CATEGORIES: readonly EsiSearchCategories[] = [
    'agent', 'alliance', 'character', 'constellation', 'corporation', 'faction', 'inventory_type', 'region', 'solar_system', 'station', 'structure'
] as const

const CatSet = new Set<EsiSearchCategories>(ALL_CATEGORIES)

// --- zod validation for query params
const QuerySchema = z.object({
    query: z.string().trim().min(1).or(z.string().length(0)).optional(),
    q: z.string().trim().min(1).optional(), // alias
    categories: z.string().optional(),
    strict: z.coerce.boolean().default(false),
    names: z.coerce.boolean().default(false),
    limit: z.coerce.number().int().min(1).max(1000).default(200),
})

// --- parse categories from query (?categories=a,b,c) or default to ['character']
function parseCategories(raw?: string): EsiSearchCategories[] {
    if (!raw || !raw.trim()) return ['character']
    const parts = raw
        .split(/[,\s]+/)
        .map(s => s.trim().toLowerCase())
        .filter(Boolean)

    if (parts.includes('all')) return [...ALL_CATEGORIES]

    const cats: EsiSearchCategories[] = []
    for (const p of parts) {
        if (CatSet.has(p as EsiSearchCategories)) cats.push(p as EsiSearchCategories)
    }
    if (!cats.length) cats.push('character')
    return Array.from(new Set(cats))
}

// --- normalize ESI singular keys -> plural keys fot the client
function normalizePlural(src: EsiSearchResult, limit: number): SearchResultPlural {
    const out: SearchResultPlural = {}
    const map: Record<string, keyof SearchResultPlural> = {
        agent: 'agents',
        alliance: 'alliances',
        character: 'characters',
        constellation: 'constellations',
        corporation: 'corporations',
        faction: 'factions',
        inventory_types: 'inventory_types',
        region: 'regions',
        solar_system: 'solar_systems',
        station: 'stations',
        structure: 'structures',
    }
    for (const [k, v] of Object.entries(src)) {
        const pk = map[k]
        if (!pk) continue
        out[pk] = (v ?? []).slice(0, limit)
    }
    return out
}

type NamedObj = { id: number, name?: string }

// --- resolve names via universe/names
async function resolveNames(ids: number[]): Promise<Array<{ id: number, name: string, category: string }>> {
    if (!ids.length) return []
    const res = await esiApi.post('/universe/names', ids, {
        validateStatus: s => s === 200 || s === 404,
    })
    if (res.status === 404) return []
    return res.data as Array<{ id: number, name: string, category: string }>
}

// --- search
export async function getSearch(
    req: Request,
    res: Response<ApiResponse<Record<string, NamedObj[]>>>,
    next: NextFunction
) {
    try {
        const qp = QuerySchema.parse(req.query)
        const q = (qp.query && qp.query.length ? qp.query : qp.q) ?? ''
        if (!q) throw new BadRequestError('Missing ?query or ?q')

        const token = (req as any).esiAccessToken as string | undefined
        const charIdParam = req.query.character_id
        const charId = charIdParam ? Number(charIdParam) : (req as any).esiCharacterId
        if (!Number.isFinite(charId)) {
            throw new BadRequestError('Missing character id (token verify failed). For testing, pass ?character_id=2123162143')
        }
        if (!token) throw new BadRequestError('Missing Bearer token')
        if (!charId) throw new BadRequestError('Missing character id from token')

        const categories = parseCategories(qp.categories)
        const raw = await searchEsi(token, charId, q, categories, qp.strict)
        const plural = normalizePlural(raw, qp.limit)

        if (!qp.names) {
            // return ids only
            const data: Record<string, NamedObj[]> = {}
            for (const [k, ids] of Object.entries(plural)) {
                data[k] = (ids ?? []).map(id => ({id}))
            }
            return res.json({success: true, data})
        }

        // resolve all names in one shot, then stitch back by category
        const allIds = Array.from(
            new Set(Object.values(plural).flatMap(arr => arr ?? []))
        )
        let namedById = new Map<number, { name: string, category: string }>()
        try {
            const resolved = await resolveNames(allIds)
            for (const n of resolved) namedById.set(n.id, {name: n.name, category: n.category})
        } catch {
            // fallback silently if name resolution fails
        }

        const data: Record<string, NamedObj[]> = {}
        for (const [k, ids] of Object.entries(plural)) {
            data[k] = (ids ?? []).map(id => {
                const hit = namedById.get(id)
                return hit ? {id, name: hit.name} : {id}
            })
        }

        res.json({success: true, data})
    } catch (e) {
        next(e)
    }
}