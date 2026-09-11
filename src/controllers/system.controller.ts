import { NextFunction, Response, Request } from "express";
import { SystemService } from "../services/system.service";
import { HTTPCodes } from "../utils/httpCodes.util";
import { DTOSystemHealth } from "../types/DTOSystemHealth";

export const health = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result: DTOSystemHealth = await SystemService.health();
    // A 200 even when DOWN would slip past uptime monitors that only check
    // the status code (e.g. Uptime Kuma's default HTTP(s) monitor).
    const statusCode =
      result.status === "UP" ? HTTPCodes.OK : HTTPCodes.ServiceUnavailable;

    return res.status(statusCode).send(result);
  } catch (error) {
    next(error);
  }
};
