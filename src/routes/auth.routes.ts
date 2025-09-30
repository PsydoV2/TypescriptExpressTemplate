import { Router } from "express";
import { register, login } from "../controllers/auth.controller";
import { rateLimitMiddleware } from "../middlewares/rateLimiter.middleware";

const router = Router();

/**
 * Authentication routes
 * - /register → User registration (with rate limiting)
 * - /login → User login (with rate limiting)
 * - /authTest → Simple test route to verify router is working
 */
router.post("/register", rateLimitMiddleware, register);
router.post("/login", rateLimitMiddleware, login);

router.get("/authTest", (_req, res) => res.send("Auth routes working!"));

export default router;
