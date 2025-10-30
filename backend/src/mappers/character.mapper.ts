import {CharacterWithRelations} from "../types/db.types.js";
import {CharacterApiResponse} from "../types/api.types.js";

export const mapCharacterToApiResponse = (character: CharacterWithRelations): CharacterApiResponse => ({
    id: character.id,
    bloodline: character.bloodline?.name ?? null,
    corporation_id: character.corporationId,
    name: character.name,
    race: character.race?.name ?? null,
    security_status: character.securityStatus,
})