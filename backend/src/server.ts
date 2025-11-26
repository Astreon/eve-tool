/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

import app from './app.js'
import config from './config/config.js'
import { logger } from './lib/logger.js'

app.listen(config.port, () => {
    logger.info('APP', 'Backend started', {
        port: config.port,
        env: config.nodeEnv,
    })
})
