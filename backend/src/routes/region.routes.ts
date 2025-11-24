import { Router } from "express";
import {getRegionLinks, getRegions} from "../controllers/region.controller.js";

const router = Router();

router.get("/", getRegions);
router.get("/links", getRegionLinks);

export default router;
