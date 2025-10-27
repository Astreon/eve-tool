import { esiApi } from '../../lib/axios.js'
import { EveCharacter } from '../../types/eve.types.js'

export const getCharacterInfo = async (characterId: number): Promise<EveCharacter> => {
  const { data } = await esiApi.get<EveCharacter>(`/characters/${characterId}/`)
  return data
}