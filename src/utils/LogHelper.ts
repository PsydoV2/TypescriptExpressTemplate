import { DBConnectionPool } from "../config/DBConnectionPool";
import fs from "fs/promises";
import path from "path";

export enum LogSeverity {
  CRITICAL = "critical",
  ERROR = "error",
  WARNING = "warning",
  INFO = "info",
}

/**
 * LogHelper utility class
 * - Provides file-based logging (info logs)
 * - Provides optional database-based logging (errors)
 * - Can be adapted depending on project requirements
 */
export class LogHelper {
  /**
   * Logs informational messages to a file.
   * @param route API route or function name
   * @param message Log message
   */
  static async logInfo(route: string, message: string) {
    try {
      const logDir = path.resolve(process.cwd(), "logs");
      await fs.mkdir(logDir, { recursive: true });

      const now = new Date();
      const day = now.toISOString().slice(0, 10); // YYYY-MM-DD
      const filePath = path.join(logDir, `info-${day}.log`);

      const line =
        `${now.toISOString()} | ${LogSeverity.INFO.toUpperCase()} | ${route} | ` +
        `${String(message).replace(/\s+/g, " ").trim()}\n`;

      await fs.appendFile(filePath, line, "utf8");
    } catch (fileErr) {
      console.error("❌ Failed to write info log file:", fileErr);
    }
  }

  /**
   * Logs errors/warnings either into a database table (ErrorLog) or console fallback.
   * @param route API route or function name
   * @param error Error object or string
   * @param level 'critical' | 'error' | 'warning'
   */
  static async logError(route: string, error: unknown, level: LogSeverity) {
    // If severity is INFO, delegate to logInfo()
    if (level === LogSeverity.INFO) {
      await LogHelper.logInfo(
        route,
        error instanceof Error ? error.stack || error.message : String(error)
      );
      return;
    }

    const errorString =
      error instanceof Error ? error.stack || error.message : String(error);

    let connection: any;
    try {
      connection = await DBConnectionPool.getConnection();
      await connection.beginTransaction();

      // Insert error log into database (adjust schema/table for your project)
      const insertSQL = `
        INSERT INTO ErrorLog (route, error, level)
        VALUES (?, ?, ?)
      `;
      await connection.execute(insertSQL, [route, errorString, level]);
      await connection.commit();
    } catch (dbErr) {
      console.error("❌ Failed to write to ErrorLog DB:", dbErr);
      if (connection) await connection.rollback();
    } finally {
      if (connection) connection.release();
    }
  }
}
