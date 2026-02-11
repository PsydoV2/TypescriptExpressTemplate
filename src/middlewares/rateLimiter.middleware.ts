import { RateLimiterMemory } from "rate-limiter-flexible";
import { Request, Response, NextFunction } from "express";
import { HTTPCodes } from "../utils/HTTPCodes";

const globalLimiter = new RateLimiterMemory({
  keyPrefix: "global",
  points: 100,
  duration: 60, // 100 Requests every 60 seconds
});

const authLimiter = new RateLimiterMemory({
  keyPrefix: "auth",
  points: 5,
  duration: 300, // 5 trys in 5 minutes
  blockDuration: 900, // 15-minute suspension for exceeding the limit
});

const createMiddleware = (limiter: RateLimiterMemory) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await limiter.consume(req.ip || "unknown");
      next();
    } catch (err: any) {
      const retrySecs = Math.ceil(err.msBeforeNext / 1000) || 1;
      res.set("Retry-After", String(retrySecs));
      return res.status(HTTPCodes.TooManyRequests).json({
        message: `Too many requests. Please try again in ${retrySecs} seconds.`
      });
    }
  };
};

export const globalRateLimit = createMiddleware(globalLimiter);
export const authRateLimit = createMiddleware(authLimiter);