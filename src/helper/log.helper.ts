import fs from "node:fs/promises";
import path from "node:path";
import { env } from "../config/env.config";
import { getRequestId, getRequestMeta } from "../utils/requestContext.util";

export const LogSeverity = {
  CRITICAL: "critical",
  ERROR: "error",
  WARNING: "warning",
  INFO: "info",
  REQUEST: "request",
} as const;

export type LogSeverity = (typeof LogSeverity)[keyof typeof LogSeverity];

// Which console method mirrors each severity to stdout/stderr — so process
// managers like PM2 (which capture console output, not the log files) pick
// logs up too, and so error-level output actually lands on stderr.
const consoleMethodBySeverity: Record<
  LogSeverity,
  "log" | "info" | "warn" | "error"
> = {
  [LogSeverity.CRITICAL]: "error",
  [LogSeverity.ERROR]: "error",
  [LogSeverity.WARNING]: "warn",
  [LogSeverity.INFO]: "info",
  [LogSeverity.REQUEST]: "log",
};

export class LogHelper {
  // Cached per process so the mkdir+access writability probe only runs
  // once per day instead of on every single log call.
  private static resolvedLogDirPromise: Promise<string> | undefined;
  private static dateDirPromises = new Map<string, Promise<string>>();

  /**
   * Formats a Date using the timezone of the machine/process running the
   * code (i.e. whatever `Date`'s local getters resolve to — the system
   * timezone, or `TZ` if set), as an ISO-8601-like string with an explicit
   * UTC offset, e.g. "2026-09-12T14:23:01.123+02:00". Deliberately not
   * `toISOString()`, which is always UTC regardless of the host's clock —
   * log timestamps should read in the host's local time.
   */
  private static formatLocalDateTime(date: Date): string {
    const pad = (n: number, len = 2) => String(n).padStart(len, "0");

    const datePart =
      `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    const timePart =
      `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}` +
      `.${pad(date.getMilliseconds(), 3)}`;

    const offsetMinutes = -date.getTimezoneOffset();
    const offsetSign = offsetMinutes >= 0 ? "+" : "-";
    const absOffsetMinutes = Math.abs(offsetMinutes);
    const offsetPart =
      `${offsetSign}${pad(Math.floor(absOffsetMinutes / 60))}:${pad(absOffsetMinutes % 60)}`;

    return `${datePart}T${timePart}${offsetPart}`;
  }

  private static getTodayDate() {
    return this.formatLocalDateTime(new Date()).slice(0, 10); // YYYY-MM-DD (local)
  }

  private static getTodayDateTime() {
    return this.formatLocalDateTime(new Date()); // YYYY-MM-DDTHH:mm:ss.sss±HH:mm (local)
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

  /** Resolves (and caches) today's date subdirectory of the base log dir. */
  private static resolveDateDir(date: string): Promise<string> {
    let cached = this.dateDirPromises.get(date);
    if (!cached) {
      cached = (async () => {
        const baseDir = await this.resolveBaseLogDir();
        const dateDir = path.join(baseDir, date);
        try {
          await this.ensureWritableDir(dateDir);
        } catch (err) {
          console.error(
            `❌ Failed to create/access log directory "${dateDir}":`,
            err,
          );
        }
        return dateDir;
      })();
      this.dateDirPromises.set(date, cached);
    }
    return cached;
  }

  private static getSeverityFilePath(dateDirPath: string, severity: LogSeverity) {
    return path.join(dateDirPath, `${severity}.log`);
  }

  private static logLineBuilder(
    route: string,
    message: string,
    severity: LogSeverity = LogSeverity.INFO,
  ) {
    const requestId = getRequestId();
    let requestIdPart = "";
    if (requestId) {
      const { ip, identity } = getRequestMeta();
      requestIdPart = ` | ${requestId} | ip=${ip} | identity=${identity}`;
    }
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

  /** Mirrors a log line to console.<log|info|warn|error>, per severity. */
  private static logToConsole(severity: LogSeverity, line: string) {
    const method = consoleMethodBySeverity[severity];
    console[method](line.trimEnd());
  }

  private static async logFile(
    route: string,
    message: string,
    severity: LogSeverity = LogSeverity.INFO,
  ) {
    const line = this.logLineBuilder(route, message, severity);
    this.logToConsole(severity, line);

    const dateDirPath = await this.resolveDateDir(this.getTodayDate());
    const filePath = this.getSeverityFilePath(dateDirPath, severity);
    await this.writeLogToFile(filePath, line);
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

  /** Writes an error-level line to today's log file. */
  public static async logError(
    route: string,
    error: unknown,
    level: LogSeverity,
  ) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    try {
      await this.logFile(route, errorMessage, level);
    } catch (fileErr) {
      console.error("❌ Failed to write error log file:", fileErr);
    }
  }
}
