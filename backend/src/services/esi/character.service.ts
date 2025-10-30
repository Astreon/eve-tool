import { esiApi } from '../../lib/axios.js'
import {EsiCharacterResponse, EveCharacter} from "../../types/esi.types.js";

export const getCharacterInfo = async (characterId: number, etag?: string): Promise<EsiCharacterResponse> => {
  try {
    const response = await esiApi.get<EveCharacter>(`/characters/${characterId}/`, {
      headers: {
        'X-Compatibility-Date': '2025-09-30',
        'Accept-Language': 'en',
        ...(etag ? { 'If-None-Match': etag } : {}),
      },
      validateStatus: status => status === 200 || status === 304,
    })

    // 304 -> no refresh
    if (response.status === 304) {
      return {
        data: null,
        etag,
      }
    }

    const headers = response.headers

    // Calculate TTL out of expires
    let ttl: number | undefined
    if (headers.expires) {
      const expiresDate = new Date(headers.expires)
      ttl = Math.max(Math.floor((expiresDate.getTime() - Date.now()) / 1000), 0)
    }

    return {
      data: response.data,
      etag: headers.etag,
      expires: headers.expires,
      lastModified: headers['last-modified'],
      ttl,
    }
  } catch (err) {
    throw err
  }
}