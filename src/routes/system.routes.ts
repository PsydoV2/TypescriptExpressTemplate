import {Router} from "express";
import {healthCheck} from "../controllers/system.controller";

const router = Router();

router.get("/health", healthCheck)

export default router;