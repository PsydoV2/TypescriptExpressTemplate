import { Request, Response } from "express";
import { AuthService } from "../services/auth.service";

/**
 * Controller for user registration.
 * Delegates the request handling to the AuthService.
 */
export const register = (req: Request, res: Response) =>
  AuthService.register(req, res);

/**
 * Controller for user login.
 * Delegates the request handling to the AuthService.
 */
export const login = (req: Request, res: Response) =>
  AuthService.login(req, res);
