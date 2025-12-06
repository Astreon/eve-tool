/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

import { pino } from 'pino'

export const collectorLogger = pino({
    name: 'collector',
    level: process.env.LOG_LEVEL ?? 'info',
})
