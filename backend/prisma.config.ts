/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

import { defineConfig, env } from 'prisma/config'
import 'dotenv/config'

export default defineConfig({
    schema: 'prisma/schema.prisma',
    migrations: {
        path: 'prisma/migrations',
    },
    engine: 'classic',
    datasource: {
        url: env('DATABASE_URL'),
    },
})
