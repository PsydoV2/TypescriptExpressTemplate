import jwt, {SignOptions} from "jsonwebtoken";

// Secret key used to sign JWT tokens
const SECRET = process.env.SECRETKEYJWT!;

export const AuthRepository = {
    async generateJWT(userID: string, expiresIn: SignOptions["expiresIn"]): Promise<string> {
        return jwt.sign({ userID: userID }, SECRET, { expiresIn });
    }
}