import { Router } from "express";
import { deleteAccount } from "../controllers/user.controller";

const router = Router();

/**
 * User routes
 * - /deleteAccount → Deletes the currently authenticated user account
 * - /userTest → Simple test route to verify router is working
 */
router.post("/deleteAccount", deleteAccount);

router.get("/userTest", (_req, res) => res.send("User routes working!"));

export default router;
