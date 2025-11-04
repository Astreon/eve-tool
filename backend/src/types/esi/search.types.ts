export type EsiSearchCategories =
    | 'agent' | 'alliance' | 'character' | 'constellation' | 'corporation'
    | 'faction' | 'inventory_type' | 'region' | 'solar_system' | 'station' | 'structure'

export interface EsiSearchResult {
    agent?: number[]
    alliance?: number[]
    character?: number[]
    constellation?: number[]
    corporation?: number[]
    faction?: number[]
    inventory_type?: number[]
    region?: number[]
    solar_system?: number[]
    station?: number[]
    structure?: number[]
}

export type SearchResultPlural = Partial<{
    agents: number[]
    alliances: number[]
    characters: number[]
    constellations: number[]
    corporations: number[]
    factions: number[]
    inventory_types: number[]
    regions: number[]
    solar_systems: number[]
    stations: number[]
    structures: number[]
}>