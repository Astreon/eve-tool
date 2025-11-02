import {importer} from "./importer.js";
import {prisma} from "../src/lib/prisma.js";
import {assertSdeDirOnThrow} from "./config";
import {getDbVersion, readSdeVersionFromFile, upsertDbVersion} from "./version";
import {purgeSdeTables} from "./resetDatabase";

console.log('🚀 Starting Static Data import from "local"...')

const DRY_RUN = process.argv.includes('--dry-run')
if (DRY_RUN) console.log('🧪 Running in dry-run mode (no DB writes)')

const start = performance.now()

;(async () => {
    // 1) .sde available
    assertSdeDirOnThrow()

    // 2) Version from file and DB
    const fileVersion = await readSdeVersionFromFile()
    const dbVersion = await getDbVersion()

    if (dbVersion && dbVersion.buildNumber === fileVersion.buildNumber) {
        console.log(
            `🆗 SDE already up to date (build ${dbVersion.buildNumber}, release ${dbVersion.releaseDate.toISOString()}). Import skipped.`
        )
        return
    }

    // 3) Clean re-import if version is new/different
    if (!DRY_RUN) {
        console.log('🧹 Performing clean re-import: purge old SDE tables...')
        await purgeSdeTables()
    } else {
        console.log('🌵 Dry-run: Skipping db purge.')
    }

    // 4) Import
    const stats = await importer(DRY_RUN)
    const totalTime = ((performance.now() - start) / 1000).toFixed(1)

    console.log(
        `✅ Imported ${stats.lineSuccess}/${stats.lineTotal} lines in ${stats.datasetSuccess}/${stats.datasetTotal} SDE datasets in ${totalTime}s (${stats.errorCount} total errors)`
    )

    // 5) Save version (only if not Dry-Run)
    if (!DRY_RUN) {
        await upsertDbVersion(fileVersion)
        console.log(`📝 SDE Version updated -> build ${fileVersion.buildNumber} (${fileVersion.releaseDate}).`)
    } else {
        console.log(`🌵 Dry-run: Version not modified.`)
    }
})()
    .catch((e) => {
        console.error('❌ Import failed:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })