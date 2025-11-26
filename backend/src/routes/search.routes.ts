/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

import { Router } from 'express'
import { searchAll } from '../controllers/search.controller.js'

const router = Router()
router.get('/', searchAll)

export default router
