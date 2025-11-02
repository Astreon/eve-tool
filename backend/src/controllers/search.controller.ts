import { Request, Response, NextFunction } from 'express'
import { searchEsi } from '../services/esi/search.service.js'
import { BadRequestError } from '../types/appError.js'
import { ApiResponse } from '../types/apiResponse.js'

export async function getCharacters(
  req: Request,
  res: Response<ApiResponse<{ id: number, name?: string }[]>>,
  next: NextFunction
) {
  try {
    const q = String(req.query.query ?? '').trim()
    if (!q) throw new BadRequestError('Missing ?query')

    const token = (req as any).esiAccessToken as string | undefined
    if (!token) throw new BadRequestError('Missing Bearer token')

    const result = await searchEsi(token, q, ['character'], false)
    const ids = result.characters ?? []

    // Optional: sofort Namen auflösen (ohne Auth) via /universe/names
    let named: { id: number, name?: string }[] = ids.map(id => ({ id }))
    if (ids.length) {
      try {
        const names = await resolveNames(ids)
        // { id, name, category }[]
        const byId = new Map<number, string>()
        for (const n of names) if (n.category === 'character') byId.set(n.id, n.name)
        named = ids.map(id => ({ id, name: byId.get(id) }))
      } catch {
        // Namen können später nachgezogen werden – IDs reichen fürs Frontend schon
      }
    }

    res.json({ success: true, data: named })
  } catch (e) { next(e) }
}

// refactor later:
import { esiApi } from '../lib/axios.js'
async function resolveNames(ids: number[]) {
  const res = await esiApi.post('/universe/names', ids, { validateStatus: s => s === 200 || s === 404 })
  if (res.status === 404) return []
  return res.data as Array<{ id: number, name: string, category: string }>
}
