/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

// server.js
import app from './app.js'
import config from './config/config.js'

app.listen(config.port, () => {
  console.log(`🚀  Server is running on http://localhost:${config.port}`)
})