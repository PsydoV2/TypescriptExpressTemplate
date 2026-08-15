import { Request, Response } from "express";
import { HTTPCodes } from "../utils/httpCodes.util";
import { ErrorCode } from "../utils/errorCodes.util";

export function notFoundHandler(_req: Request, res: Response) {
  res
    .status(HTTPCodes.NotFound)
    .json({ code: ErrorCode.NOT_FOUND, message: "Route not found" });
}
