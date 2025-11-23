import {Region} from "../../generated/client.js"

export type RegionWithRelations = Region & {
    faction: { name: string }
}