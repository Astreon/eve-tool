import {Request, Response, NextFunction} from 'express'
import {searchEsi} from '../services/esi/search.service.js'
import {BadRequestError} from '../types/appError.js'
import {ApiResponse} from '../types/apiResponse.js'
import {esiApi} from "../lib/axios.js";
import {extractCharacterIdFromJwt} from "../utils/jwt.js";

async function resolveNames(ids: number[]) {
  const res = await esiApi.post('/universe/names', ids, { validateStatus: s => s === 200 || s === 404 })
  if (res.status === 404) return []
  return res.data as Array<{ id: number; name: string; category: string }>
}

export async function searchAll(
  req: Request,
  res: Response<ApiResponse<Record<string, { id: number; name?: string }[]>>>,
  next: NextFunction
) {
  try {
    const q = String(req.query.query ?? '').trim()
    if (!q) throw new BadRequestError('Missing ?query')

    const categories = String(req.query.categories ?? 'character')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean) as any

    const strict = String(req.query.strict ?? 'false').toLowerCase() === 'true'

    const token = (req as any).esiAccessToken as string | undefined
    if (!token) throw new BadRequestError('Missing Bearer token')

    const cidParam = req.query.character_id ? Number(req.query.character_id) : undefined
    const characterId =
      Number.isFinite(cidParam) && cidParam! > 0 ? (cidParam as number) : (extractCharacterIdFromJwt(token) ?? 0)
    if (!characterId) throw new BadRequestError('Missing character_id (and could not derive from token)')

    const result = await searchEsi(token, characterId, q, categories, strict)

    const out: Record<string, { id: number; name?: string }[]> = {}
    for (const [cat, ids] of Object.entries(result) as [string, number[]][]) {
      out[cat] = (ids ?? []).map(id => ({ id }))
    }

    const charIds = result.characters ?? []
    if (charIds.length) {
      try {
        const named = await resolveNames(charIds)
        const byId = new Map<number, string>()
        for (const n of named) if (n.category === 'character') byId.set(n.id, n.name)
        out.characters = charIds.map(id => ({ id, name: byId.get(id) }))
      } catch { /* ignore */ }
    }

    res.json({ success: true, data: out })
  } catch (e) { next(e) }
}