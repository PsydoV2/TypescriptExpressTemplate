import { Request, Response, NextFunction } from "express";
import { LogHelper, LogSeverity } from "../helper/LogHelper";
import { HTTPCodes } from "../utils/HTTPCodes";
import { ApiError } from "../utils/ApiError";
import { ErrorCode } from "../utils/ErrorCodes";

export async function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
) {
  const route = req.originalUrl || req.url;

  const severity =
    err instanceof ApiError ? LogSeverity.WARNING : LogSeverity.CRITICAL;

  await LogHelper.logError(route, err, severity);

  if (err instanceof ApiError) {
    return res
      .status(err.status)
      .json({ code: err.code, message: err.message });
  }

  res.status(HTTPCodes.InternalServerError).json({
    code: ErrorCode.INTERNAL_ERROR,
    message: "Internal server error",
  });
}
