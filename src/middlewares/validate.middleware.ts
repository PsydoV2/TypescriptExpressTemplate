import { Request, Response, NextFunction } from "express";
import { ZodError, ZodType } from "zod";
import { ApiError } from "../utils/ApiError";
import { HTTPCodes } from "../utils/HTTPCodes";

export const validate = (schema: ZodType) => // Hier ZodType verwenden
    async (req: Request, _res: Response, next: NextFunction) => {
        try {
            await schema.parseAsync({
                body: req.body,
                query: req.query,
                params: req.params,
            });
            next();
        } catch (error) {
            if (error instanceof ZodError) {
                const message: string = error.issues
                    .map(e => `${e.path.join(".")}: ${e.message}`)
                    .join(", ");
                return next(new ApiError(HTTPCodes.BadRequest, message));
            }
            next(error);
        }
    };