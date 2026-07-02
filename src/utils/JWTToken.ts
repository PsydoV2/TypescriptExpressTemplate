import jwt from "jsonwebtoken";
import { env } from "../config/env";

export const getSecret = () => env.SECRETKEYJWT;

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
    header: string | undefined,
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
      const decoded: unknown = jwt.verify(token, getSecret());

      if (
        typeof decoded === "object" &&
        decoded !== null &&
        "userID" in decoded &&
        typeof (decoded as Record<string, unknown>).userID === "string"
      ) {
        return { userID: (decoded as { userID: string }).userID };
      }

      return undefined;
    } catch {
      return undefined;
    }
  }
}
