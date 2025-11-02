import {
    importBloodlines,
    importConstellations,
    importFactions,
    importRaces,
    importRegions,
    importSolarSystems
} from "./importers";


export interface ImportResult {
    success: number
    total: number
    errors: number
}

export interface ImportStats {
    datasetTotal: number
    datasetSuccess: number
    lineTotal: number
    lineSuccess: number
    errorCount: number
}

export const importer = async (dryRun = false): Promise<ImportStats> => {
    const stats: ImportStats = {
        datasetTotal: 0,
        datasetSuccess: 0,
        lineTotal: 0,
        lineSuccess: 0,
        errorCount: 0,
    }

    const imports = [
        {name: 'Bloodlines', fn: importBloodlines},
        {name: 'Constellation', fn: importConstellations},
        {name: 'Factions', fn: importFactions},
        {name: 'Races', fn: importRaces},
        {name: 'Region', fn: importRegions},
        {name: 'Solar Systems', fn: importSolarSystems},
        // import additional SDE datasets here
    ]

    stats.datasetTotal = imports.length

    for (const imp of imports) {
        console.log(`📦 Importing ${imp.name}...`)
        const datasetStart = performance.now()

        try {
            const result = await imp.fn(dryRun)
            stats.datasetSuccess++
            stats.lineTotal += result.total
            stats.lineSuccess += result.success
            stats.errorCount += result.errors

            const duration = ((performance.now() - datasetStart) / 1000).toFixed(1)
            console.log(`✅ Imported ${result.success}/${result.total} ${imp.name} in ${duration}s (${result.errors} errors)`)
        } catch (err) {
            stats.errorCount++
            console.log(`❌ Failed to import ${imp.name}:`, (err as Error).message)
        }
    }

    return stats
}