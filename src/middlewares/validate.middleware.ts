import { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";
import { ApiError } from "../utils/ApiError";
import { HTTPCodes } from "../utils/HTTPCodes";
import { ErrorCode } from "../utils/ErrorCodes";

export const validate =
  (schema: ZodSchema) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return next(
        new ApiError(
          HTTPCodes.BadRequest,
          ErrorCode.MISSING_PARAMETERS,
          result.error.issues[0].message,
        ),
      );
    }
    req.body = result.data;
    next();
  };

export const validateQuery =
  (schema: ZodSchema) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      return next(
        new ApiError(
          HTTPCodes.BadRequest,
          ErrorCode.MISSING_PARAMETERS,
          result.error.issues[0].message,
        ),
      );
    }
    req.query = result.data as Record<string, string>;
    next();
  };
