/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

import { Router } from "express";
import {
    getRegionLinks,
    getRegions,
} from "../controllers/region.controller.js";

const router = Router();

router.get("/", getRegions);
router.get("/links", getRegionLinks);

export default router;
