import { DBConnectionPool, isDBConfigured } from "../config/DBConnectionPool";
import fs from "fs/promises";
import path from "path";

export enum LogSeverity {
  CRITICAL = "critical",
  ERROR = "error",
  WARNING = "warning",
  INFO = "info",
  REQUEST = "request"
}

/**
 * LogHelper utility class
 * - Provides file-based logging (info logs)
 * - Provides optional database-based logging (errors)
 * - Can be adapted depending on project requirements
 */
export class LogHelper {
  private static dbConfigWarned = false;

  private static getTodayDate() {
    return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  }

  private static getTodayDateTime() {
    return new Date().toISOString(); // YYYY-MM-DDTHH:mm:ss.sssZ
  }

  private static async createLogDirIfNotExists(logDirName: string) {
    const logDir = path.resolve(process.cwd(), logDirName);
    try {
      await fs.mkdir(logDir, { recursive: true });
    } catch (err) {
      console.error("❌ Failed to create logs directory:", err);
    }

    return logDir;
  }

  private static getTodayFilePath(logDirPath: string, prefix: string) {
    return path.join(logDirPath, `${prefix}-${this.getTodayDate()}.log`);
  }

  private static logLineBuilder(route: string, message: string, severity: LogSeverity = LogSeverity.INFO) {
    return `${this.getTodayDateTime()} | ${severity.toUpperCase()} | ${route} | ` +
           `${String(message).replace(/\s+/g, " ").trim()}\n`;
  }

  private static async writeLogToFile(filePath: string, line: string) {
    try {
      await fs.appendFile(filePath, line, "utf8");
    } catch (fileErr) {
      console.error("❌ Failed to write log file:", fileErr);
    }
  }

  private static async logFile(route: string, message: string, severity: LogSeverity = LogSeverity.INFO){
    const logDirPath = await this.createLogDirIfNotExists("logs");
    const todayFilePath = this.getTodayFilePath(logDirPath, severity);
    const line = this.logLineBuilder(route, message, severity);

    await this.writeLogToFile(todayFilePath, line);
  }

  /**
   * Logs informational messages to a file.
   * @param route API route or function name
   * @param message Log message
   */
  public static async logInfo(route: string, message: string) {
    try {
      await this.logFile(route, message);
    } catch (fileErr) {
      console.error("❌ Failed to write info log file:", fileErr);
    }
  }

  /**
   * Logs Requests to a file (can be adapted to log to DB if needed).
   * @param route Requested route
   * @param payload Payload or details of the request (stringified)
   */
  public static async logRequest(route: string, payload: string) {
    try {
      await this.logFile(route, payload, LogSeverity.REQUEST);
    } catch (fileErr) {
      console.error("❌ Failed to write request log file:", fileErr);
    }
  }

  /**
   * Logs errors/warnings either into a database table (ErrorLog) or console fallback.
   * @param route API route or function name
   * @param error Error object or string
   * @param level 'critical' | 'error' | 'warning'
   */
  public static async logError(route: string, error: unknown, level: LogSeverity) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (level === LogSeverity.INFO) {
      await LogHelper.logInfo(route, errorMessage);
      return;
    }

    try {
      await this.logFile(route, errorMessage, level);
    } catch (fileErr) {
      console.error("❌ Failed to write error log file:", fileErr);
    }

    // If DB is not configured, skip DB logging and emit a one-time file warning
    if (!isDBConfigured()) {
      if (!this.dbConfigWarned) {
        await this.logFile("DBConnection", "Database configuration is incomplete. DB logging is disabled.", LogSeverity.CRITICAL);
        this.dbConfigWarned = true;
      }
      return;
    }

    const errorString =
      error instanceof Error ? error.stack || error.message : String(error);

    let connection = await DBConnectionPool.getConnection();
    try {
      await connection.beginTransaction();

      // Insert error log into database (adjust schema/table for your project)
      const insertSQL = `
        INSERT INTO ErrorLog (route, error, level)
        VALUES (?, ?, ?)
      `;

      const []: any = await connection.query(
          insertSQL,
          [route, errorString, level]
      );

      await connection.commit();
    } catch (dbError) {
      await connection.rollback();

      await this.logFile("DBConnection", `DB logging failed: ${dbError instanceof Error ? dbError.message : String(dbError)}`, LogSeverity.CRITICAL);
    } finally {
      connection.release();
    }
  }
}
