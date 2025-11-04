import { Router } from 'express'
import characterRoutes from './character.routes.js'
import authRoutes from './auth.routes.js'
import {requireAuth} from "../middlewares/requireAuth.js";
import {getCharacter} from "../controllers/character.controller.js";
import searchRoutes from "./search.routes.js";

const router = Router()

router.use('/auth', authRoutes)

// public routes
router.use('/api/character', characterRoutes) //2123162143

// authenticated routes
router.use('/api/search', requireAuth, searchRoutes)

export default router
