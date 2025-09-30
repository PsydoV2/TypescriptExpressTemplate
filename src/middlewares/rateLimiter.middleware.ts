import { RateLimiterMemory } from "rate-limiter-flexible";
import { Request, Response, NextFunction } from "express";
import { HTTPCodes } from "../utils/HTTPCodes";

/**
 * Rate limiter for sensitive routes (e.g., login).
 * - Allows max. 5 attempts per 5 minutes per IP.
 * - If the limit is exceeded, blocks the IP for 15 minutes.
 */
const limiter = new RateLimiterMemory({
  keyPrefix: "auth_limit", // Unique key for this limiter
  points: 5, // Max number of attempts
  duration: 300, // Time window (in seconds) = 5 minutes
  blockDuration: 900, // Block time (in seconds) = 15 minutes
});

/**
 * Middleware to apply the rate limiter logic.
 * - Consumes 1 point per request.
 * - If points are exceeded → returns HTTP 429 Too Many Requests.
 */
export async function rateLimitMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    await limiter.consume(req.ip || "unknown"); // Track requests by IP
    next();
  } catch (err: any) {
    const retrySecs = Math.ceil(err.msBeforeNext / 1000);
    return res.status(HTTPCodes.TooManyRequests).json({
      message: `Too many attempts. Try again in ${retrySecs} seconds.`,
    });
  }
}
