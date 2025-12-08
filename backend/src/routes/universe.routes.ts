/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

import { Router } from 'express'
import { searchUniverseByName } from '../controllers/universeSearch.controller.js'

const router = Router()

router.get('/search', searchUniverseByName)

export default router
