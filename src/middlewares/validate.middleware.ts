import { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";
import { ApiError } from "../utils/ApiError";
import { HTTPCodes } from "../utils/HTTPCodes";
import { ErrorCode } from "../utils/ErrorCodes";

/**
 * Validates the request against a Zod schema describing the
 * `{ body, query, params }` envelope, then writes the parsed (and coerced)
 * values back onto the request.
 *
 * Schemas only need to declare the parts they care about, e.g.
 * `z.object({ body: z.object({ ... }) })`.
 */
export const validate =
  (schema: ZodSchema) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    if (!result.success) {
      return next(
        new ApiError(
          HTTPCodes.BadRequest,
          ErrorCode.MISSING_PARAMETERS,
          result.error.issues[0].message,
        ),
      );
    }

    const data = result.data as {
      body?: unknown;
      query?: unknown;
      params?: unknown;
    };

    if (data.body !== undefined) {
      req.body = data.body;
    }

    // Express 5: req.query and req.params are read-only getters and can no
    // longer be reassigned — mutate them in place instead.
    if (data.query !== undefined) {
      replaceInPlace(
        req.query as Record<string, unknown>,
        data.query as Record<string, unknown>,
      );
    }
    if (data.params !== undefined) {
      replaceInPlace(
        req.params as Record<string, unknown>,
        data.params as Record<string, unknown>,
      );
    }

    next();
  };

function replaceInPlace(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
): void {
  for (const key of Object.keys(target)) {
    delete target[key];
  }
  Object.assign(target, source);
}
