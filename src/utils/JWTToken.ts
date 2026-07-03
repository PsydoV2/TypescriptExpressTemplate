import jwt, { SignOptions } from "jsonwebtoken";
import { env } from "../config/env";

export const getSecret = () => env.SECRETKEYJWT;

/**
 * JWT payload interface.
 * - Extend this depending on what you store in your tokens.
 */
export interface AuthTokenPayload {
  userID: string;
}

export class JWTToken {
  /**
   * Signs a new JWT for the given userID.
   */
  static generateAuthToken(
    userID: string,
    expiresIn: SignOptions["expiresIn"],
  ): string {
    return jwt.sign({ userID, purpose: "access" }, getSecret(), {
      expiresIn,
    });
  }

  /**
   * Signs a short-lived JWT for the password-reset flow. Tagged with a
   * `purpose` claim so it can't be reused as a regular auth token even if it
   * leaks into an Authorization header.
   */
  static generatePasswordResetToken(
    userID: string,
    expiresIn: SignOptions["expiresIn"],
  ): string {
    return jwt.sign({ userID, purpose: "password-reset" }, getSecret(), {
      expiresIn,
    });
  }

  /**
   * Verifies a password-reset token and returns the userID it was issued
   * for, or undefined if it's invalid, expired, or not a reset token.
   */
  static verifyPasswordResetToken(token: string): string | undefined {
    try {
      const decoded: unknown = jwt.verify(token, getSecret());

      if (
        typeof decoded === "object" &&
        decoded !== null &&
        (decoded as Record<string, unknown>).purpose === "password-reset" &&
        typeof (decoded as Record<string, unknown>).userID === "string"
      ) {
        return (decoded as { userID: string }).userID;
      }

      return undefined;
    } catch {
      return undefined;
    }
  }

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
        typeof (decoded as Record<string, unknown>).userID === "string" &&
        (decoded as Record<string, unknown>).purpose !== "password-reset"
      ) {
        return { userID: (decoded as { userID: string }).userID };
      }

      return undefined;
    } catch {
      return undefined;
    }
  }
}
