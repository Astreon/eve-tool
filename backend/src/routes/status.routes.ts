/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

import { Router } from 'express';
import { getStatus } from '../controllers/status.controller.js';

const router = Router();

router.get('/', getStatus);

export default router;
