import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import {LogHelper, LogSeverity} from "./LogHelper";

dotenv.config();

const getSecret = () => {
  const secret = process.env.SECRETKEYJWT || "";
  if (!secret) {
    void LogHelper.logError("ENV", "❌ SECRETKEYJWT missing in .env", LogSeverity.CRITICAL);
    throw new Error("❌ SECRETKEYJWT missing in .env");
  }
  return secret;
}

/**
 * JWT payload interface.
 * - Extend this depending on what you store in your tokens.
 */
export interface AuthTokenPayload {
  userID: string;
}

/**
 * Utility class for handling JWT tokens.
 * - Extracts tokens from headers
 * - Verifies tokens and returns payload
 */
export class JWTToken {
  /**
   * Extracts the JWT token string from an Authorization header.
   * Expects header format: "Bearer <token>"
   */
  static extractTokenFromHeader(
    header: string | undefined
  ): string | undefined {
    if (!header) return undefined;

    const [scheme, token] = header.split(" ");
    if (scheme !== "Bearer" || !token) return undefined;

    return token;
  }

  /**
   * Verifies a JWT token and returns its payload.
   * Returns undefined if the token is invalid or does not contain a userID.
   */
  static verifyAuthToken(token: string): AuthTokenPayload | undefined {
    try {
      const decoded = jwt.verify(token, getSecret()) as unknown;

      if (
        typeof decoded === "object" &&
        decoded !== null &&
        "userID" in decoded &&
        typeof (decoded as any).userID === "number"
      ) {
        return decoded as AuthTokenPayload;
      }

      return undefined;
    } catch {
      return undefined;
    }
  }
}
