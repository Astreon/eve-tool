/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

import {
    runInstall,
    runImport,
    runCalculate,
    runUpdate,
    runDownload,
    type SdeGlobalOptions,
    type InstallerCommand,
} from '../installer'
import { logger } from '../lib/logger'

interface ParsedArgs {
    command: InstallerCommand
    subcommand?: string
    options: SdeGlobalOptions
}

// --- Argument Parsing
function parseArgs(argv: string[]): ParsedArgs {
    const positional: string[] = []
    const options: SdeGlobalOptions = {
        dryRun: false,
        force: false,
    }

    for (const arg of argv) {
        if (arg === '--dry-run') {
            options.dryRun = true
            continue
        }

        if (arg === '--force') {
            options.force = true
            continue
        }

        if (arg.startsWith('--datasets=')) {
            const value = arg.slice('--datasets='.length).trim()
            if (value.length) {
                options.datasets = value
                    .split(',')
                    .map((v) => v.trim().toLowerCase())
                    .filter((v) => v.length > 0)
            }
            continue
        }

        if (arg.startsWith('-')) {
            logger.warn(`⚠️ Unknown option: ${arg}`)
            continue
        }

        positional.push(arg)
    }

    const first = (positional[0] ?? 'help').toLowerCase()
    let command: InstallerCommand = 'help'
    let subcommand: string | undefined = positional[1]

    switch (first) {
        case 'install':
        case 'import':
        case 'calculate':
        case 'update':
        case 'download':
            command = first
            break
        case 'help':
        default:
            command = 'help'
            break
    }

    if (command !== 'calculate') {
        subcommand = undefined
    }

    return { command, subcommand, options }
}

function printHelp() {
    const msg = `
        Usage: sde <command> [options]
        
        Commands:
          install         Force full pipeline (download, import, calculate and cache)
          import          Version-aware import (full or partial via --datasets=...)
          calculate       Version-aware calculations (all or single task)
          update          Version-aware import and calculate on version change
          download        Only ensure .sde files on disk
        
        Options:
          --dry-run       Don't write to DB or Redis, just simulate
          --force         Ignore version match and run anyway
          --datasets=a,b  Only import selected datasets (for "import")
        `
    console.log(msg)
}

// --- CLI Entry
;(async () => {
    try {
        const { command, subcommand, options } = parseArgs(
            process.argv.slice(2),
        )

        switch (command) {
            case 'install':
                await runInstall(options)
                return
            case 'import':
                await runImport(options)
                return
            case 'calculate':
                await runCalculate(subcommand, options)
                return
            case 'update':
                await runUpdate(options)
                return
            case 'download':
                await runDownload(options)
                return
            case 'help':
            default:
                printHelp()
                return
        }
    } catch (err) {
        logger.error(err, '❌ SDE installer failed.')
        process.exitCode = 1
    }
})()
