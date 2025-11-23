import { Router } from 'express'
import characterRoutes from './character.routes.js'
import authRoutes from './auth.routes.js'
import {requireAuth} from "../middlewares/requireAuth.js";
import searchRoutes from "./search.routes.js";
import statusRoutes from "./status.routes.js";
import regionRoutes from "./region.routes.js";

const router = Router()

router.use('/auth', authRoutes)

// public routes
router.use ('/api/status', statusRoutes)
router.use('/api/characters', characterRoutes) //2123162143
router.use('/api/regions', regionRoutes)

// authenticated routes
router.use('/api/search', requireAuth, searchRoutes)

export default router
