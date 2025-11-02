import {Character} from "../../generated/client.js";

export type CharacterWithRelations = Character & {
    race: { name: string }
    bloodline: { name: string }
}