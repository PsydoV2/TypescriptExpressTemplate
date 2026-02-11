import {NextFunction, Request, Response} from "express";
import { AuthService } from "../services/auth.service";
import {HTTPCodes} from "../utils/HTTPCodes";

/**
 * Controller for user registration.
 * Delegates the request handling to the AuthService.
 */
export const registerUser = async (req: Request, res: Response, next: NextFunction) => {
    const { username, email, password } = req.body;

    try{
        const result = await AuthService.registerUser(username, email, password);

        return res.status(HTTPCodes.OK).json(result);
    }catch (error) {
        next(error);
    }
}

/**
 * Controller for user login.
 * Delegates the request handling to the AuthService.
 */
export const loginUser = async (req: Request, res: Response, next: NextFunction) => {
    const { emailOrUsername, password } = req.body;

    try{
        const result = await AuthService.loginUser(emailOrUsername, password);

        return res.status(HTTPCodes.OK).json(result);
    }catch (error) {
        next(error);
    }
}
