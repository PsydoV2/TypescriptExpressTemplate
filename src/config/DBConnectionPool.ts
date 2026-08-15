import mysql, { Pool } from "mysql2/promise";
import { env } from "./env";

export const isDBConfigured = () =>
  !!(env.DBHOST && env.DBPORT && env.DBNAME && env.DBUSER && env.DBPASSWORD);

const CONNECTION_LIMIT = 20;

export const DBConnectionPool: Pool = mysql.createPool({
  host: env.DBHOST,
  port: env.DBPORT,
  user: env.DBUSER,
  password: env.DBPASSWORD,
  database: env.DBNAME,

  waitForConnections: true,
  connectionLimit: CONNECTION_LIMIT,
  queueLimit: 0,

  enableKeepAlive: true,
  keepAliveInitialDelay: 10000, // 10s
  connectTimeout: 10000, // 10s

  supportBigNumbers: true,
  decimalNumbers: true,
  dateStrings: true,
});

/**
 * mysql2's Pool doesn't expose a public stats API, so this reads its
 * internal connection queues defensively — cast through `unknown` and fall
 * back to `null` if the shape isn't what's expected, so a future mysql2
 * upgrade that renames these fields degrades gracefully instead of crashing.
 */
export function getDBPoolStats(): {
  total: number | null;
  free: number | null;
  limit: number;
} {
  try {
    const corePool = (
      DBConnectionPool as unknown as {
        pool?: {
          _allConnections?: { length?: unknown };
          _freeConnections?: { length?: unknown };
        };
      }
    ).pool;

    const total =
      typeof corePool?._allConnections?.length === "number"
        ? corePool._allConnections.length
        : null;
    const free =
      typeof corePool?._freeConnections?.length === "number"
        ? corePool._freeConnections.length
        : null;

    return { total, free, limit: CONNECTION_LIMIT };
  } catch {
    return { total: null, free: null, limit: CONNECTION_LIMIT };
  }
}
