import crypto from "node:crypto";
import { Pool, PoolConnection, RowDataPacket } from "mysql2/promise";
import { DBConnectionPool } from "../config/DBConnectionPool";
import { env } from "../config/env";

type DBExecutor = Pool | PoolConnection;

interface RefreshTokenRow extends RowDataPacket {
  userID: string;
  expiresAt: Date;
}

// Only the hash is stored, never the raw token, so a leaked database dump
// alone can't be used to authenticate.
function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export const RefreshTokenRepository = {
  /** Issues a new refresh token for the user and stores its hash. Returns the raw (unhashed) token. */
  async create(userID: string, connection?: DBExecutor): Promise<string> {
    const db = connection ?? DBConnectionPool;

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenID = crypto.randomUUID();
    const expiresAt = new Date(
      Date.now() + env.REFRESH_TOKEN_EXPIRES_IN_DAYS * 24 * 60 * 60 * 1000,
    );

    await db.query(
      "INSERT INTO RefreshTokens (tokenID, userID, tokenHash, expiresAt) VALUES (?, ?, ?, ?)",
      [tokenID, userID, hashToken(rawToken), expiresAt],
    );

    return rawToken;
  },

  /**
   * Looks up a non-revoked refresh token. `expired` is reported separately
   * from "not found" so callers can distinguish the two cases.
   */
  async findByToken(
    rawToken: string,
    connection?: DBExecutor,
  ): Promise<{ userID: string; expired: boolean } | null> {
    const db = connection ?? DBConnectionPool;

    const [rows] = await db.query<RefreshTokenRow[]>(
      "SELECT userID, expiresAt FROM RefreshTokens WHERE tokenHash = ? AND revoked = FALSE",
      [hashToken(rawToken)],
    );

    const row = rows[0];
    if (!row) return null;

    return {
      userID: row.userID,
      expired: row.expiresAt.getTime() < Date.now(),
    };
  },

  async revoke(rawToken: string, connection?: DBExecutor): Promise<void> {
    const db = connection ?? DBConnectionPool;

    await db.query(
      "UPDATE RefreshTokens SET revoked = TRUE WHERE tokenHash = ?",
      [hashToken(rawToken)],
    );
  },
};
