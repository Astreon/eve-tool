import {esiApi} from '../../lib/axios.js'
import {EsiCharacterResponse, EsiCharacter} from "../../types/esi.types.js";
import {buildConditionalHeaders, computeTtlFromHeaders, extractCachingHeaders} from "../../utils/cacheControl.js";

export const getCharacterInfo = async (characterId: number, etag?: string): Promise<EsiCharacterResponse> => {
    const response = await esiApi.get<EsiCharacter>(`/characters/${characterId}/`, {
        headers: buildConditionalHeaders({etag}),
        validateStatus: s => s === 200 || s === 304,
    })

    const meta = extractCachingHeaders(response.headers)
    const ttl = computeTtlFromHeaders(response.headers)

    if (response.status === 304) {
        return {
            data: null,
            etag: meta.etag,
            expires: meta.expires,
            lastModified: meta.lastModified,
            ttl,
        }
    }

    return {
        data: response.data,
        etag: meta.etag,
        expires: meta.expires,
        lastModified: meta.lastModified,
        ttl,
    }
}