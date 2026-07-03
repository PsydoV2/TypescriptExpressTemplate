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

export const refreshToken = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { refreshToken } = req.body;

  try {
    const result = await AuthService.refreshAccessToken(refreshToken);

    return res.status(HTTPCodes.OK).json(result);
  } catch (error) {
    next(error);
  }
};

export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { refreshToken } = req.body;

  try {
    const result = await AuthService.logout(refreshToken);

    return res.status(HTTPCodes.OK).json(result);
  } catch (error) {
    next(error);
  }
};

export const requestPasswordReset = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { email } = req.body;

  try {
    const result = await AuthService.requestPasswordReset(email);

    return res.status(HTTPCodes.OK).json(result);
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { token, newPassword } = req.body;

  try {
    const result = await AuthService.resetPassword(token, newPassword);

    return res.status(HTTPCodes.OK).json(result);
  } catch (error) {
    next(error);
  }
};
