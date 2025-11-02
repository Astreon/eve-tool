export interface EsiCharacter {
    //alliance_id?: number
    //birthday: string
    bloodline_id: number
    corporation_id: number
    //description?: string
    //faction_id?: number
    //gender: 'male' | 'female'
    name: string
    race_id: number
    security_status: number | null
    //title?: string
}

export interface EsiCharacterResponse {
    data: EsiCharacter | null
    etag?: string | null
    ttl?: number | null
    expires?: string | null
    lastModified?: string | null
}