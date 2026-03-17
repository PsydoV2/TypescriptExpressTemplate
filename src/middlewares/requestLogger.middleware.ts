import {NextFunction, Request, Response} from "express";
import {LogHelper, LogSeverity} from "../utils/LogHelper";

const SENSITIVE_FIELDS = new Set(["password", "passwordHash", "token", "secret", "authorization"]);

function redactSensitiveFields(obj: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
        result[key] = SENSITIVE_FIELDS.has(key.toLowerCase()) ? "[REDACTED]" : value;
    }
    return result;
}

/**
 * Global request logger middleware.
 * - Logs each request with route and payload
 * - Redacts sensitive fields (password, token, etc.) before logging
 */
export const globalRequestLogger = async (
    req: Request,
    _res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        let payload: string;

        if (req.method === "GET") {
            payload = JSON.stringify(redactSensitiveFields(req.query as Record<string, unknown>));
        } else {
            payload = req.body ? JSON.stringify(redactSensitiveFields(req.body)) : "";
        }

        await LogHelper.logRequest(req.path, payload);

    } catch (error) {
        console.error("Error in globalRequestLogger:", error);
        await LogHelper.logError("globalRequestLogger()", error, LogSeverity.WARNING);
    } finally {
        next();
    }
};