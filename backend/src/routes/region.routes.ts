import { Router } from "express";
import { getRegions } from "../controllers/region.controller.js";

const router = Router();

router.get("/", getRegions);

export default router;
