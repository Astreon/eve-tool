export interface EveCharacter {
  alliance_id?: number
  birthday: string
  bloodline_id: number
  corporation_id: number
  description?: string
  faction_id?: number
  gender: 'male' | 'female'
  name: string
  race_id: number
  security_status: number
  title: string
}

export interface EveCharacterExtended extends EveCharacter {
  race?: string
  bloodline?: string
}