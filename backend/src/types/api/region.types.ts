export interface RegionFactionApi {
  id: number
  name: string
}

export interface RegionApiResponse {
  id: number
  name: string
  x: number
  y: number
  z: number
  faction: RegionFactionApi | null
}