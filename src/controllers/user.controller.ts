import { Request, Response } from "express";
import { UserService } from "../services/user.service";

/**
 * Controller for deleting a user account.
 * Delegates the request handling to the UserService.
 */
export const deleteAccount = (req: Request, res: Response) =>
  UserService.deleteAccount(req, res);
