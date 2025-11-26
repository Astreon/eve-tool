/*
 * SPDX-License-Identifier: CC-BY-NC-SA-4.0
 * Copyright (C) 2025 Astreon
 */

import { Router } from 'express';
import { getCharacter } from '../controllers/character.controller.js';

const router = Router();

router.get('/:id', getCharacter);

export default router;
