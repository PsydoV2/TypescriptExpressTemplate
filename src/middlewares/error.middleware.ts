import { Request, Response, NextFunction } from "express";
import { HTTPCodes } from "../utils/HTTPCodes";
import { ApiError } from "../utils/ApiError";

/**
 * Middleware for handling 404 Not Found errors.
 * Triggered when no route matches the incoming request.
 */
export function notFoundHandler(_req: Request, res: Response) {
  res.status(HTTPCodes.NotFound).json({ message: "Route not found" });
}

/**
 * Global error handling middleware.
 * - Handles custom ApiError instances with specific status and message.
 * - Falls back to 500 Internal Server Error for unknown errors.
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof ApiError) {
    return res.status(err.status).json({ message: err.message });
  }

  res.status(HTTPCodes.InternalServerError).json({
    message: "Internal server error",
  });
}
