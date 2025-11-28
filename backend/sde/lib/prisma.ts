/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

import { PrismaClient } from '../../src/generated/client.js'
import { sdeLogger } from './logger.js'

export const sdePrisma = new PrismaClient()

// Optional: kurzes Info-Log, aber KEIN Query-Spam
sdePrisma
    .$connect()
    .then(() => {
        sdeLogger.info('🗄️ Connected to PostgreSQL via Prisma (SDE)')
    })
    .catch((err) => {
        sdeLogger.error('❌ Failed to connect Prisma (SDE):', err)
    })
