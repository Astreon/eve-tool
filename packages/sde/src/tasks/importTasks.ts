/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

import {
    importBloodlines,
    importRaces,
    importFactions,
    importRegions,
    importConstellations,
    importSolarSystems,
    importStargates,
    importPlanets,
    importMoons,
    importTypes,
    importAsteroidBelts,
    importStars,
    importNpcStations,
    importStationServices,
    importStationOperations,
} from '../importers'
import type { ImportResult } from '../importer.js'

export type ImportDatasetId =
    | 'bloodlines'
    | 'races'
    | 'factions'
    | 'regions'
    | 'constellations'
    | 'solarsystems'
    | 'stargates'
    | 'planets'
    | 'moons'
    | 'types'
    | 'asteroidbelts'
    | 'stars'
    | 'npcstations'
    | 'stationservices'
    | 'stationoperations'

export interface ImportTask {
    id: ImportDatasetId
    label: string
    run: (dryRun: boolean, label: string) => Promise<ImportResult>
}

export const IMPORT_TASKS: ImportTask[] = [
    {
        id: 'bloodlines',
        label: 'Bloodlines',
        run: importBloodlines,
    },
    {
        id: 'races',
        label: 'Races',
        run: importRaces,
    },
    {
        id: 'factions',
        label: 'Factions',
        run: importFactions,
    },
    {
        id: 'regions',
        label: 'Regions',
        run: importRegions,
    },
    {
        id: 'constellations',
        label: 'Constellations',
        run: importConstellations,
    },
    {
        id: 'solarsystems',
        label: 'Solar Systems',
        run: importSolarSystems,
    },
    {
        id: 'stargates',
        label: 'Stargates',
        run: importStargates,
    },
    {
        id: 'planets',
        label: 'Planets',
        run: importPlanets,
    },
    {
        id: 'moons',
        label: 'Moons',
        run: importMoons,
    },
    {
        id: 'types',
        label: 'Types',
        run: importTypes,
    },
    {
        id: 'asteroidbelts',
        label: 'Asteroid Belts',
        run: importAsteroidBelts,
    },
    {
        id: 'stars',
        label: 'Stars',
        run: importStars,
    },
    {
        id: 'npcstations',
        label: 'NPC Stations',
        run: importNpcStations,
    },
    {
        id: 'stationservices',
        label: 'Station Services',
        run: importStationServices,
    },
    {
        id: 'stationoperations',
        label: 'Station Operations',
        run: importStationOperations,
    },
]

export const IMPORT_TASKS_BY_ID: Record<ImportDatasetId, ImportTask> =
    IMPORT_TASKS.reduce(
        (acc, task) => {
            acc[task.id] = task
            return acc
        },
        {} as Record<ImportDatasetId, ImportTask>,
    )
