export interface EveCharacter {
    //alliance_id?: number
    //birthday: string
    bloodline_id: number
    corporation_id: number
    //description?: string
    //faction_id?: number
    //gender: 'male' | 'female'
    name: string
    race_id: number
    security_status?: number
    //title?: string
}

export interface EsiCharacterResponse {
    data: EveCharacter | null
    etag?: string
    expires?: string
    lastModified?: string
    ttl?: number
}