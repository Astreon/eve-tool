/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

export type EsiSearchCategories =
    | 'agent' | 'alliance' | 'character' | 'constellation' | 'corporation'
    | 'faction' | 'inventory_type' | 'region' | 'solar_system' | 'station' | 'structure'

export interface EsiSearchResult {
  agents?: number[]
  alliances?: number[]
  characters?: number[]
  constellations?: number[]
  corporations?: number[]
  factions?: number[]
  inventory_types?: number[]
  regions?: number[]
  solar_systems?: number[]
  stations?: number[]
  structures?: number[]
}