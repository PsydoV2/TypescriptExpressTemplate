import { NextFunction, Request, Response } from "express";
import crypto from "node:crypto";
import { runWithRequestId } from "../utils/RequestContext";

/**
 * Assigns each request a correlation ID and stores it in AsyncLocalStorage,
 * so LogHelper can attach it to every log line for that request without the
 * ID being passed around manually.
 */
export const correlationId = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const incoming = req.headers["x-request-id"];
  const id =
    typeof incoming === "string" && incoming ? incoming : crypto.randomUUID();
  req.headers["x-request-id"] = id;
  res.setHeader("x-request-id", id);
  runWithRequestId(id, next);
};
