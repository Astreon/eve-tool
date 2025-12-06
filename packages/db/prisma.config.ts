/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

import 'dotenv/config'
import { env } from 'prisma/config'
import { PrismaConfig } from 'prisma'

export default {
    schema: 'prisma/schema.prisma',
    migrations: {
        path: 'prisma/migrations',
    },
    datasource: {
        url: env('DATABASE_URL'),
    },
} satisfies PrismaConfig
