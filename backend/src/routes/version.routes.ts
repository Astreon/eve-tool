/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

import { Router } from 'express'
import { getVersion } from '../controllers/version.controller.js'

const router = Router()

router.get('/', getVersion)

export default router
