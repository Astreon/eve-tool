import {CharacterWithRelations} from "../types/db/character.types.js";
import {CharacterApiResponse} from "../types/api/character.types.js";

export const mapCharacterToApiResponse = (character: CharacterWithRelations): CharacterApiResponse => ({
    id: character.id,
    bloodline: character.bloodline.name,
    corporation_id: character.corporationId,
    name: character.name,
    race: character.race.name,
    security_status: character.securityStatus ?? null,
})