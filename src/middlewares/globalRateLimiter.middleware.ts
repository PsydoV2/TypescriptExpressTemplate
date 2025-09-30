import rateLimit from "express-rate-limit";

/**
 * Global rate limiter middleware.
 * - Limits each IP to 100 requests per minute.
 * - Helps protect against brute force and denial-of-service attacks.
 */
export const globalRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  limit: 100, // Limit each IP to 100 requests per window
  message: "Too many requests. Please try again later.",
});
