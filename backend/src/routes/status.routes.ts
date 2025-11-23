import {Router} from 'express'
import {getStatus} from '../controllers/status.controller.js'

const router = Router()

router.get('/', getStatus)

export default router
