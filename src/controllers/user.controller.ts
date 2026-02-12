import { Request, Response, NextFunction } from "express";
import { UserService } from "../services/user.service";
import { HTTPCodes } from "../utils/HTTPCodes";


export const deleteAccount = async (req: Request, res: Response, next: NextFunction) => {
    const userID: string = req.userID as string;

    try {
        const result = await UserService.deleteUser(userID);

        return res.status(HTTPCodes.OK).json(result);
    } catch (error: any) {
        next(error);
    }
};

export const getUser = async (req: Request, res: Response, next: NextFunction) => {
    const userID: string = req.userID as string;

    try{
        const result = await UserService.getUser(userID);

        return res.status(HTTPCodes.OK).json(result);
    }catch (error: any) {
        next(error);
    }
}