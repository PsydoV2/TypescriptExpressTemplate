import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const SECRET = process.env.SECRETKEYJWT || "";
if (!SECRET) throw new Error("❌ SECRETKEYJWT missing in .env");

/**
 * JWT payload interface.
 * - Extend this depending on what you store in your tokens.
 */
export interface AuthTokenPayload {
  userID: number;
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
    return header?.split(" ")[1];
  }

  /**
   * Verifies a JWT token and returns its payload.
   * Returns undefined if the token is invalid or does not contain a userID.
   */
  static verifyAuthToken(token: string): AuthTokenPayload | undefined {
    try {
      const decoded = jwt.verify(token, SECRET) as unknown;

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
