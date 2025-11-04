import {EsiSearchCategories, EsiSearchResult} from "../../types/esi/search.types.js";
import {esiApi} from "../../lib/axios.js";
import config from "../../config/config.js";

const KEY_MAP: Record<string, keyof EsiSearchResult> = {
  agent: 'agents',
  alliance: 'alliances',
  character: 'characters',
  constellation: 'constellations',
  corporation: 'corporations',
  faction: 'factions',
  inventory_type: 'inventory_types',
  region: 'regions',
  solar_system: 'solar_systems',
  station: 'stations',
  structure: 'structures',
}

function normalizeKeys(input: Record<string, number[]> | undefined): EsiSearchResult {
  const out: EsiSearchResult = {}
  if (!input) return out
  for (const [k, v] of Object.entries(input)) {
    const key = KEY_MAP[k] ?? (k as keyof EsiSearchResult)
    ;(out as any)[key] = Array.isArray(v) ? v : []
  }
  return out
}

export async function searchEsi(
  token: string,
  characterId: number,
  query: string,
  categories: EsiSearchCategories[] = ['character'],
  strict = false
): Promise<EsiSearchResult> {
  const res = await esiApi.get(`/characters/${characterId}/search`, {
    params: { categories: categories.join(','), search: query, strict },
    headers: { Authorization: `Bearer ${token}` },
    validateStatus: s => s === 200 || s === 404,
  })
  if (res.status === 404) return {}
  return normalizeKeys(res.data as Record<string, number[]>)
}