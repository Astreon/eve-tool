import { Router } from 'express'
import { getCharacter } from '../controllers/character.controller.js'

const router = Router()

router.get('/:id', getCharacter)

export default router
