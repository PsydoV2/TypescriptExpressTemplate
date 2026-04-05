import { NextFunction, Response, Request } from "express";
import { SystemService } from "../services/system.service";
import { HTTPCodes } from "../utils/HTTPCodes";
import DTOSystemHealth from "../types/DTOSystemHealth";

export const health = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result: DTOSystemHealth = await SystemService.health();

    return res.status(HTTPCodes.OK).send(result);
  } catch (error) {
    next(error);
  }
};
