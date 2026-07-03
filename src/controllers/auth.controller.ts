import { NextFunction, Request, Response } from "express";
import { AuthService } from "../services/auth.service";
import { HTTPCodes } from "../utils/HTTPCodes";

export const registerUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { username, email, password } = req.body;

  try {
    const result = await AuthService.registerUser(username, email, password);

    return res.status(HTTPCodes.OK).json(result);
  } catch (error) {
    next(error);
  }
};

export const loginUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { emailOrUsername, password } = req.body;

  try {
    const result = await AuthService.loginUser(emailOrUsername, password);

    return res.status(HTTPCodes.OK).json(result);
  } catch (error) {
    next(error);
  }
};
