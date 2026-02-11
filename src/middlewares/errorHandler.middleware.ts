// middleware/errorHandler.ts
import { Request, Response, NextFunction } from "express";
import { LogHelper, LogSeverity } from "../utils/LogHelper";
import { HTTPCodes } from "../utils/HTTPCodes";
import { ApiError } from "../utils/ApiError";

export async function errorHandler(
    err: unknown,
    req: Request,
    res: Response,
    _next: NextFunction
) {
    const route = req.originalUrl || req.url;

    const severity = err instanceof ApiError ? LogSeverity.WARNING : LogSeverity.CRITICAL;

    await LogHelper.logError(route, err, severity);

    if (err instanceof ApiError) {
        return res.status(err.status).json({ message: err.message });
    }

    res.status(HTTPCodes.InternalServerError).json({
        message: "Internal server error",
    });
}