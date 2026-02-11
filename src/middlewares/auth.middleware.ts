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
export const authMiddleware = (
    req: Request,
    res: Response,
    next: NextFunction
): void | Response => {
  const authHeader = req.headers.authorization;
  const token = JWTToken.extractTokenFromHeader(authHeader);

  // 1. Check if token exists
  if (!token) {
    return res.status(HTTPCodes.Unauthorized).json({
      message: "Authentication required",
      code: "MISSING_TOKEN",
    });
  }

  // 2. Verify token
  const payload = JWTToken.verifyAuthToken(token);

  if (!payload || !payload.userID) {
    return res.status(HTTPCodes.Unauthorized).json({
      message: "Session expired or invalid",
      code: "UNAUTHORIZED",
    });
  }

  // 3. Attach userID (Dank d.ts Datei jetzt typsicher ohne 'as any')
  req.userID = payload.userID;

  return next();
};