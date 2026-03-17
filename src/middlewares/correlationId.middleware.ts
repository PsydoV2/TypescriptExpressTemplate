import {NextFunction, Request, Response} from "express";
import crypto from "crypto";
import {runWithRequestId} from "../utils/RequestContext";

/**
 * Correlation ID middleware.
 * - Uses incoming x-request-id header if provided, otherwise generates a new UUID
 * - Attaches the ID to the response header for client-side tracing
 * - Stores the ID in AsyncLocalStorage so LogHelper can access it automatically
 */
export const correlationId = (req: Request, res: Response, next: NextFunction): void => {
    const id = (req.headers["x-request-id"] as string) || crypto.randomUUID();
    req.headers["x-request-id"] = id;
    res.setHeader("x-request-id", id);
    runWithRequestId(id, next);
};
