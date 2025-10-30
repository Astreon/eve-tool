import {importSdeFiles} from "./importSdeFiles.js";
import {prisma} from "../../src/lib/prisma.js";

console.log('🚀 Starting Static Data import from "local"...')

const DRY_RUN = process.argv.includes('--dry-run')
if (DRY_RUN) console.log('🧪 Running in dry-run mode (no DB writes)')

const start = performance.now()

importSdeFiles(DRY_RUN).then((stats) => {
    const totalTime = ((performance.now() - start) / 1000).toFixed(1)
    console.log(`✅ Imported ${stats.lineSuccess}/${stats.lineTotal} lines in ${stats.datasetSuccess}/${stats.datasetTotal} SDE datasets in ${totalTime}s (${stats.errorCount} total errors)`)
}).catch((err) => {
    console.error('❌ Import failed:', err)
}).finally(async () => {
    await prisma.$disconnect()
})