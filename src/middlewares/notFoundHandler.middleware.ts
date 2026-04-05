import { Request, Response } from "express";
import { HTTPCodes } from "../utils/HTTPCodes";
import { ErrorCode } from "../utils/ErrorCodes";

export function notFoundHandler(_req: Request, res: Response) {
  res
    .status(HTTPCodes.NotFound)
    .json({ code: ErrorCode.NOT_FOUND, message: "Route not found" });
}
