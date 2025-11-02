import {EsiSearchCategories, EsiSearchResult} from "../../types/esi/search.types.js";
import {esiApi} from "../../lib/axios.js";

export async function searchEsi(
    token: string,
    query: string,
    categories: EsiSearchCategories[] = ['character'],
    strict = false
): Promise<EsiSearchResult> {
    const res = await esiApi.get('/search', {
        params: { categories: categories.join(','), search: query, strict },
        headers: { Authorization: `Bearer ${token}` },
        validateStatus: s => s === 200 || s === 404,
    })
    if (res.status === 404) return {}
    return res.data as EsiSearchResult
}