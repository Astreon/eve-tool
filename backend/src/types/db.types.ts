import {Character} from "../generated/client.js";

export type CharacterWithRelations = Character & {
    race: { name: string } | null
    bloodline: { name: string } | null
}