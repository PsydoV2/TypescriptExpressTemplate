import { Router } from "express";
import { registerUser, loginUser } from "../controllers/auth.controller";

const router = Router();

/**
 * Authentication routes
 * - /register → User registration (with rate limiting)
 * - /login → User login (with rate limiting)
 * - /authTest → Simple test route to verify router is working
 */
router.post("/register", registerUser);
router.post("/login", loginUser);

router.get("/authTest", (_req, res) => res.send("Auth routes working!"));

export default router;
