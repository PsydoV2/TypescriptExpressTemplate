import jwt, { SignOptions } from "jsonwebtoken";
import { env } from "../config/env";

export const AuthRepository = {
    async generateJWT(userID: string, expiresIn: SignOptions["expiresIn"]): Promise<string> {
        return jwt.sign({ userID: userID }, env.SECRETKEYJWT, { expiresIn });
    }
}
