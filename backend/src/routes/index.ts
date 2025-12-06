/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

import { Router } from 'express'
import { requireAuth } from '../middlewares/requireAuth.js'
import authRoutes from './auth.routes.js'
import statusRoutes from './status.routes.js'
import versionRoutes from './version.routes.js'
import characterRoutes from './character.routes.js'
import regionRoutes from './region.routes.js'
import searchRoutes from './search.routes.js'
import systemRoutes from './system.routes.js'

const router = Router()

router.use('/auth', authRoutes)

// public routes
router.use('/api/status', statusRoutes) // always available
router.use('/api/version', versionRoutes)
router.use('/api/characters', characterRoutes)
router.use('/api/regions', regionRoutes)
router.use('/api/systems', systemRoutes)

// authenticated routes
router.use('/api/search', requireAuth, searchRoutes)

export default router
