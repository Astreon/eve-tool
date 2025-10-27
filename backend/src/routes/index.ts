import { Router } from 'express'
import characterRoutes from './character.routes.js'

const router = Router()

router.use('/api/character', characterRoutes) //2123162143

export default router
