import {NextFunction, Request, Response} from "express";
import {LogHelper, LogSeverity} from "../utils/LogHelper";

/**
 * Global request logger middleware.
 * - Logs each request with route and payload
 */
export const globalRequestLogger = async (
    req: Request,
    _res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const payload = req.body ? JSON.stringify(req.body) : "";

        await LogHelper.logRequest(req.originalUrl || req.url, payload);
    } catch (error) {
        console.error("Error in globalRequestLogger:", error);
        await LogHelper.logError("globalRequestLogger()", error, LogSeverity.WARNING)
    } finally {
        next();
    }
};