/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

import { PrismaClient } from '../../src/generated/client.js'
import { sdeLogger } from './logger.js'
import { PrismaPg } from '@prisma/adapter-pg'

const connectionString = `${process.env.DATABASE_URL}`
const adapter = new PrismaPg({ connectionString })
export const sdePrisma = new PrismaClient({ adapter })

// Optional: kurzes Info-Log, aber KEIN Query-Spam
sdePrisma
    .$connect()
    .then(() => {
        sdeLogger.info('🗄️ Connected to PostgreSQL via Prisma (SDE)')
    })
    .catch((err) => {
        sdeLogger.error('❌ Failed to connect Prisma (SDE):', err)
    })
