import * as path from 'path'
import * as fs from 'fs'

/**
 * SDE_DIR has to be created manually outside the root directory (where frontend and backend folder is).
 */
export const SDE_DIR = path.resolve(process.cwd(), '../.sde')
export const BATCH_SIZE = Number(100)

export function assertSdeDirOnThrow() {
    const exists = fs.existsSync(SDE_DIR) && fs.lstatSync(SDE_DIR).isDirectory()
    if (!exists) {
        throw new Error(
            `SDE Folder not found in ${SDE_DIR}\n` +
            `Place your JSONL-Files in "../.sde"`
        )
    }
}