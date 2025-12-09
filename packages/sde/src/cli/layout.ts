/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

import { exportMapLayouts, importMapLayouts } from '../layout/index.js'
import { logger } from '../lib/logger.js'
import { prisma } from '../lib/prisma.js'

type LayoutCommand = 'export' | 'import'

interface LayoutCliOptions {
    command: LayoutCommand
    regionId?: number
    layoutMode?: string
    truncateExisting?: boolean
}

function parseCliArgs(): LayoutCliOptions {
    const [, , ...argv] = process.argv

    const commandArg = (argv[0] ?? 'export').toLowerCase()
    let command: LayoutCommand

    switch (commandArg) {
        case 'export':
        case 'import':
            command = commandArg
            break
        default:
            command = 'export'
            break
    }

    let regionId: number | undefined
    let layoutMode: string | undefined
    let truncateExisting: boolean | undefined

    for (const arg of argv.slice(1)) {
        if (arg.startsWith('--region=')) {
            const value = arg.slice('--region='.length)
            const parsed = Number(value)
            if (Number.isFinite(parsed)) {
                regionId = parsed
            }
        } else if (arg.startsWith('--mode=')) {
            layoutMode = arg.slice('--mode='.length)
        } else if (arg === '--no-truncate') {
            truncateExisting = false
        }
    }

    return { command, regionId, layoutMode, truncateExisting }
}

void (async () => {
    const { command, regionId, layoutMode, truncateExisting } = parseCliArgs()

    try {
        if (command === 'export') {
            logger.info(
                { regionId: regionId ?? 'ALL', layoutMode },
                'SDE Layouts – EXPORT',
            )
            await exportMapLayouts({ regionId, layoutMode })
            logger.info('Layout export finished')
        } else if (command === 'import') {
            logger.info(
                {
                    regionId: regionId ?? 'ALL',
                    layoutMode,
                    truncateExisting,
                },
                'SDE Layouts – IMPORT from seed',
            )
            await importMapLayouts({ regionId, layoutMode, truncateExisting })
            logger.info('Layout import finished')
        } else {
            logger.error(
                { command },
                'Unknown layout command. Use: export | import',
            )
            process.exitCode = 1
        }
    } catch (err) {
        logger.error({ err }, 'Layout CLI command failed')
        process.exitCode = 1
    } finally {
        await prisma.$disconnect().catch(() => {})

        process.exit(process.exitCode ?? 0)
    }
})()
