import { NextFunction, Request, Response } from "express";
import { LogHelper, LogSeverity } from "../helper/LogHelper";

const SENSITIVE_FIELDS = new Set([
  "password",
  "passwordHash",
  "token",
  "secret",
  "authorization",
]);

function redactSensitiveFields(
  obj: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    result[key] = SENSITIVE_FIELDS.has(key.toLowerCase())
      ? "[REDACTED]"
      : value;
  }
  return result;
}

export const globalRequestLogger = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  // CORS preflight: no body, no auth, always the same noise — skip logging.
  if (req.method === "OPTIONS") {
    next();
    return;
  }

  try {
    // req.path gets rewritten once Express mounts into a sub-router (e.g.
    // /api/v1/admin/foo -> /foo inside that router's own middleware);
    // originalUrl is immune to that. Captured now, before any rewriting.
    const route = req.originalUrl || req.path;
    let payload: string;

    if (req.method === "GET") {
      payload = JSON.stringify(
        redactSensitiveFields(req.query as Record<string, unknown>),
      );
    } else {
      payload = req.body ? JSON.stringify(redactSensitiveFields(req.body)) : "";
    }

    // Log once the response is actually sent, so the line can include the
    // real status code.
    res.on("finish", () => {
      void LogHelper.logRequest(route, `status=${res.statusCode} | ${payload}`);
    });
  } catch (error) {
    console.error("Error in globalRequestLogger:", error);
    await LogHelper.logError(
      "globalRequestLogger()",
      error,
      LogSeverity.WARNING,
    );
  } finally {
    next();
  }
};
