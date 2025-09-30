import { Request, Response, NextFunction } from "express";
import { HTTPCodes } from "../utils/HTTPCodes";
import { JWTToken } from "../utils/JWTToken";

/**
 * Authentication middleware to protect secured routes.
 * - Extracts JWT token from the "Authorization" header.
 * - Verifies the token validity.
 * - If valid → attaches userID from payload to the request object.
 * - If invalid or missing → responds with 401 Unauthorized.
 */
export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Log incoming request (optional, for debugging)
  console.info("Incoming request:", req.method, req.url);

  // Extract token from Authorization header
  const token = JWTToken.extractTokenFromHeader(req.headers.authorization);
  if (!token) {
    return res.status(HTTPCodes.Unauthorized).json({
      message: "Access denied! No token provided",
      code: "NO_TOKEN",
    });
  }

  // Verify the token
  const payload = JWTToken.verifyAuthToken(token);
  if (!payload) {
    return res.status(HTTPCodes.Unauthorized).json({
      message: "Access denied! Invalid or expired token",
      code: "INVALID_TOKEN",
    });
  }

  // Attach userID to the request for further usage
  (req as any).userID = payload.userID;

  // Continue to the next middleware or route handler
  next();
}
