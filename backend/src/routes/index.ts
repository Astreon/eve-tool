import { Router } from 'express'
import characterRoutes from './character.routes.js'
import authRoutes from './auth.routes.js'
import {requireAuth} from "../middlewares/requireAuth.js";
import {getCharacter} from "../controllers/character.controller.js";

const router = Router()

router.use('/auth', authRoutes)
router.use('/api/character', characterRoutes) //2123162143

router.use('/search/characters', requireAuth, getCharacter)

export default router
