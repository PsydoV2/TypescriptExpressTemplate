import { Request, Response, NextFunction } from "express";
import { HTTPCodes } from "../utils/HTTPCodes";
import { ErrorCode } from "../utils/ErrorCodes";
import { JWTToken } from "../utils/JWTToken";

export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
): void | Response => {
  const authHeader = req.headers.authorization;
  const token = JWTToken.extractTokenFromHeader(authHeader);

  // 1. Check if token exists
  if (!token) {
    return res.status(HTTPCodes.Unauthorized).json({
      code: ErrorCode.MISSING_TOKEN,
      message: "Authentication required",
    });
  }

  // 2. Verify token
  const payload = JWTToken.verifyAuthToken(token);

  if (!payload || !payload.userID) {
    return res.status(HTTPCodes.Unauthorized).json({
      code: ErrorCode.UNAUTHORIZED,
      message: "Session expired or invalid",
    });
  }

  // 3. Attach userID
  req.userID = payload.userID;

  return next();
};
