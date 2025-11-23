import {importer} from "./importer.js"
import {prisma} from "../src/lib/prisma.js"
import {assertSdeDirOnThrow} from "./config"
import {getDbVersion, readSdeVersionFromFile, upsertDbVersion} from "./version"
import {ensureLatestSdeOnDisk} from "./remote"
import {invalidateSdeCaches} from "./cache.js"
import {redis} from "../src/lib/redis";

console.log('🚀 Starting Static Data import (remote-aware)…')

const DRY_RUN = process.argv.includes('--dry-run')
if (DRY_RUN) console.log('🧪 Running in dry-run mode (no DB writes)')

const start = performance.now()

;(async () => {
    // 0) Remote check & download (only if not Dry-Run)
    if (!DRY_RUN) {
        console.log('🔎 Checking for latest SDE version…')
        await ensureLatestSdeOnDisk()
    } else {
        console.log('🌵 Dry-run: skipping remote version check and download.')
    }

    // 1) .sde available?
    assertSdeDirOnThrow()

    // 2) Version from File and DB (now with update .sde)
    const fileVersion = await readSdeVersionFromFile()
    const dbVersion = await getDbVersion()

    if (dbVersion && dbVersion.buildNumber === fileVersion.buildNumber) {
        console.log(
            `🆗 SDE already up to date (build ${dbVersion.buildNumber}, release ${dbVersion.releaseDate.toISOString()}). Import skipped.`,
        )
        return
    }

    // 3) Clean re-import if version new/different
    if (!DRY_RUN) {
        console.log(
            `🧨 Detected version change (DB: ${dbVersion?.buildNumber ?? 'none'} -> File: ${
                fileVersion.buildNumber
            }). Purging SDE tables…`,
        )
    } else {
        console.log('🌵 Dry-run: Skipping db purge.')
    }

    // 4) Import
    const stats = await importer(DRY_RUN)
    const totalTime = ((performance.now() - start) / 1000).toFixed(1)

    console.log(
        `✅ Imported ${stats.lineSuccess}/${stats.lineTotal} lines across ${stats.datasetSuccess}/${stats.datasetTotal} SDE datasets in ${totalTime}s (${stats.errorCount} total errors)`,
    )

    // 5) Redis-Caches invalidieren (nur wenn wir wirklich geschrieben haben)
    if (!DRY_RUN) {
        await invalidateSdeCaches()
        console.log("🧹 Redis SDE caches invalidated.")
    } else {
        console.log("🌵 Dry-run: Redis caches not modified.")
    }

    // 6) Safe version (only if not Dry-Run)
    if (!DRY_RUN) {
        await upsertDbVersion(fileVersion)
        console.log(
            `📝 SDE Version updated -> build ${fileVersion.buildNumber} (${fileVersion.releaseDate.toISOString()}).`,
        )
    } else {
        console.log('🌵 Dry-run: Version not modified.')
    }
})()
    .catch((e) => {
        console.error('❌ Import failed:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()

        try {
            await redis.quit()
        } catch {
        }
    })
