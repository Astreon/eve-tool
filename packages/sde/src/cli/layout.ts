/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

import { logger } from '../lib/logger'
import { prisma } from '../lib/prisma'
import { redis } from '../lib/redis'
import { exportLayouts, importLayouts } from '../layout/layoutSeed'

type LayoutCommand = 'export' | 'import'
type LayoutMode = string

function parseCliArgs(): {
    command: LayoutCommand
    regionId?: number
    layoutMode?: LayoutMode
} {
    const [, , ...argv] = process.argv

    const first = (argv[0] ?? 'export').toLowerCase()
    let command: LayoutCommand

    switch (first) {
        case 'export':
        case 'import':
            command = first
            break
        default:
            command = 'export'
            break
    }

    let regionId: number | undefined
    let layoutMode: LayoutMode | undefined

    for (const arg of argv.slice(1)) {
        if (/^\d+$/.test(arg)) {
            regionId = Number(arg)
            continue
        }

        if (arg.startsWith('--region=')) {
            regionId = Number(arg.slice('--region='.length))
            continue
        }

        if (arg.startsWith('--layout=')) {
            layoutMode = arg.slice('--layout='.length)
        }
    }

    return { command, regionId, layoutMode }
}

;(async () => {
    const { command, regionId, layoutMode } = parseCliArgs()

    try {
        if (command === 'export') {
            logger.info('🧭 SDE Layouts – EXPORT')
            await exportLayouts({ regionId, layoutMode })
            logger.info('✅ Layout export finished.')
            return
        }

        if (command === 'import') {
            logger.info('🧭 SDE Layouts – IMPORT from seed')
            await importLayouts({ regionId, layoutMode })
            logger.info('✅ Layout import finished.')
            return
        }
    } catch (err) {
        logger.error('❌ Layout seed command failed:', err)
        process.exitCode = 1
    } finally {
        try {
            await prisma.$disconnect()
        } catch {
            // ignore
        }

        try {
            await redis.quit()
        } catch {
            // ignore
        }
    }
})()
