/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

import { Router } from 'express'
import {
    getRegions,
    getRegionLinks,
    getRegionGraph,
    getRegionMap,
} from '../controllers/region.controller.js'

const router = Router()

router.get('/', getRegions) // ?knownSpaceOnly=true
router.get('/links', getRegionLinks)

router.get('/graph', getRegionGraph)
router.get('/:regionId/map', getRegionMap)

export default router
