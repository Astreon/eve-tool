/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

import { Router } from 'express'
import { getSystemOverview } from '../controllers/system.controller.js'

const router = Router()

router.get('/:systemId/overview', getSystemOverview)

export default router
