import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/apiError.util";
import { HTTPCodes } from "../utils/httpCodes.util";
import { ErrorCode } from "../utils/errorCodes.util";

const REQUEST_TIMEOUT_MS = 30_000;

export function requestTimeout(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const timer = setTimeout(() => {
    if (!res.headersSent) {
      next(
        new ApiError(
          HTTPCodes.RequestTimeout,
          ErrorCode.REQUEST_TIMEOUT,
          "Request timeout",
        ),
      );
    }
  }, REQUEST_TIMEOUT_MS);

  res.on("finish", () => clearTimeout(timer));
  res.on("close", () => clearTimeout(timer));

  next();
}
