import { Request, Response } from "express";
import { HTTPCodes } from "../utils/HTTPCodes";

/**
 * Middleware for handling 404 Not Found errors.
 * Triggered when no route matches the incoming request.
 */
export function notFoundHandler(_req: Request, res: Response) {
  res.status(HTTPCodes.NotFound).json({ message: "Route not found" });
}

