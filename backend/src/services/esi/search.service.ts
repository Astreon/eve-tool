import {EsiSearchCategories, EsiSearchResult} from "../../types/esi/search.types.js";
import {esiApi} from "../../lib/axios.js";
import config from "../../config/config.js";

export async function searchEsi(
  token: string,
  characterId: number,
  query: string,
  categories: EsiSearchCategories[] = ['character'],
  strict = false
): Promise<EsiSearchResult> {
  const res = await esiApi.get(
    // ✅ must be template literal, not quotes
    `/characters/${characterId}/search`,
    {
      params: {
        categories: categories.join(','),
        search: query,
        strict,
      },
      headers: {
        Authorization: `Bearer ${token}`,
        'Accept-Language': config.esiApi.esiAcceptLanguage,
      },
      validateStatus: s => s === 200 || s === 404,
    }
  )
  if (res.status === 404) return {}
  return res.data as EsiSearchResult
}