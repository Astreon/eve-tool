import {Router} from "express";
import {getSearch} from "../controllers/search.controller.js";

const router = Router()
router.get('/', getSearch)

export default router