import { DBConnectionPool, isDBConfigured } from "../config/DBConnectionPool";
import fs from "node:fs/promises";
import path from "node:path";
import { env } from "../config/env";
import { getRequestId } from "../utils/RequestContext";

export const LogSeverity = {
  CRITICAL: "critical",
  ERROR: "error",
  WARNING: "warning",
  INFO: "info",
  REQUEST: "request",
} as const;

export type LogSeverity = (typeof LogSeverity)[keyof typeof LogSeverity];

export class LogHelper {
  private static dbConfigWarned = false;

  // Cached per process so the mkdir+access writability probe only runs
  // once per severity instead of on every single log call.
  private static resolvedLogDirPromise: Promise<string> | undefined;
  private static severityDirPromises = new Map<LogSeverity, Promise<string>>();

  private static getTodayDate() {
    return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  }

  private static getTodayDateTime() {
    return new Date().toISOString(); // YYYY-MM-DDTHH:mm:ss.sssZ
  }

  private static defaultLogDir(): string {
    return path.resolve(__dirname, "..", "logs");
  }

  /** Creates `dir` (recursively) and verifies this process can write to it. */
  private static async ensureWritableDir(dir: string): Promise<void> {
    await fs.mkdir(dir, { recursive: true });
    await fs.access(dir, fs.constants.W_OK);
  }

  /**
   * Resolves the base `logs/` directory, verifying it's actually writable
   * (not just that it exists — e.g. it could be owned by another user).
   * Falls back to the local default directory if `LOG_DIR` isn't usable.
   * The result is cached for the lifetime of the process.
   */
  private static resolveBaseLogDir(): Promise<string> {
    if (!this.resolvedLogDirPromise) {
      this.resolvedLogDirPromise = (async () => {
        const defaultDir = this.defaultLogDir();

        if (!env.LOG_DIR) {
          await this.ensureWritableDir(defaultDir);
          return defaultDir;
        }

        const configuredDir = path.resolve(env.LOG_DIR);
        try {
          await this.ensureWritableDir(configuredDir);
          return configuredDir;
        } catch (err) {
          console.error(
            `⚠️ LOG_DIR "${configuredDir}" is not writable, falling back to "${defaultDir}":`,
            err,
          );
          try {
            await this.ensureWritableDir(defaultDir);
          } catch (fallbackErr) {
            // Neither directory is writable — return the path anyway so the
            // resulting write failure surfaces the real, correct path.
            console.error(
              `❌ Fallback logs directory "${defaultDir}" is not writable either:`,
              fallbackErr,
            );
          }
          return defaultDir;
        }
      })();
    }

    return this.resolvedLogDirPromise;
  }

  /** Returns the resolved base `logs/` directory this process is writing to. */
  public static async getBaseLogDir(): Promise<string> {
    return this.resolveBaseLogDir();
  }

  /** Resolves (and caches) the per-severity subdirectory of the base log dir. */
  private static resolveSeverityDir(severity: LogSeverity): Promise<string> {
    let cached = this.severityDirPromises.get(severity);
    if (!cached) {
      cached = (async () => {
        const baseDir = await this.resolveBaseLogDir();
        const severityDir = path.join(baseDir, severity);
        try {
          await this.ensureWritableDir(severityDir);
        } catch (err) {
          console.error(
            `❌ Failed to create/access log directory "${severityDir}":`,
            err,
          );
        }
        return severityDir;
      })();
      this.severityDirPromises.set(severity, cached);
    }
    return cached;
  }

  private static getTodayFilePath(logDirPath: string) {
    return path.join(logDirPath, `${this.getTodayDate()}.log`);
  }

  private static logLineBuilder(
    route: string,
    message: string,
    severity: LogSeverity = LogSeverity.INFO,
  ) {
    const requestId = getRequestId();
    const requestIdPart = requestId ? ` | ${requestId}` : "";
    return (
      `${this.getTodayDateTime()} | ${severity.toUpperCase()}${requestIdPart} | ${route} | ` +
      `${String(message).replace(/\s+/g, " ").trim()}\n`
    );
  }

  private static async writeLogToFile(filePath: string, line: string) {
    try {
      await fs.appendFile(filePath, line, "utf8");
    } catch (fileErr) {
      console.error("❌ Failed to write log file:", fileErr);
    }
  }

  private static async logFile(
    route: string,
    message: string,
    severity: LogSeverity = LogSeverity.INFO,
  ) {
    const severityDirPath = await this.resolveSeverityDir(severity);
    const todayFilePath = this.getTodayFilePath(severityDirPath);
    const line = this.logLineBuilder(route, message, severity);

    await this.writeLogToFile(todayFilePath, line);
  }

  /** Writes an info-level line to today's log file. */
  public static async logInfo(route: string, message: string) {
    try {
      await this.logFile(route, message);
    } catch (fileErr) {
      console.error("❌ Failed to write info log file:", fileErr);
    }
  }

  /** Writes a request-level line to today's log file. */
  public static async logRequest(route: string, payload: string) {
    try {
      await this.logFile(route, payload, LogSeverity.REQUEST);
    } catch (fileErr) {
      console.error("❌ Failed to write request log file:", fileErr);
    }
  }

  /**
   * Writes an error-level line to today's log file and, for WARNING and
   * above, also inserts it into the ErrorLog table (skipped, with a
   * one-time warning, if the database isn't configured).
   */
  public static async logError(
    route: string,
    error: unknown,
    level: LogSeverity,
  ) {
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
        await this.logFile(
          "DBConnection",
          "Database configuration is incomplete. DB logging is disabled.",
          LogSeverity.CRITICAL,
        );
        this.dbConfigWarned = true;
      }
      return;
    }

    const errorString =
      error instanceof Error ? error.stack || error.message : String(error);

    const connection = await DBConnectionPool.getConnection();
    try {
      // Insert error log into database (adjust schema/table for your project)
      const insertSQL = `
        INSERT INTO ErrorLog (route, error, level)
        VALUES (?, ?, ?)
      `;

      await connection.query(insertSQL, [route, errorString, level]);
    } catch (dbError) {
      await this.logFile(
        "DBConnection",
        `DB logging failed: ${dbError instanceof Error ? dbError.message : String(dbError)}`,
        LogSeverity.CRITICAL,
      );
    } finally {
      connection.release();
    }
  }
}
