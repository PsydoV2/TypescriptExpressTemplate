import { authMiddleware } from "../../../src/middlewares/auth.middleware";
import { JWTToken } from "../../../src/utils/JWTToken";
import { Request, Response, NextFunction } from "express";
import "express";

declare module "express-serve-static-core" {
    interface Request {
        userID?: string;
    }
}

describe("authMiddleware", () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let nextFunction: NextFunction = jest.fn();

    beforeEach(() => {
        mockRequest = { headers: {} };
        mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
    });

    it("should return 401 if no authorization header is present", () => {
        authMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);

        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
            code: "MISSING_TOKEN"
        }));
    });

    it("should call next() if token is valid", () => {
        // Mock: Simuliere erfolgreiche Token-Verifizierung
        jest.spyOn(JWTToken, "extractTokenFromHeader").mockReturnValue("valid-token");
        jest.spyOn(JWTToken, "verifyAuthToken").mockReturnValue({ userID: "user-123" });

        authMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalled();
        expect(mockRequest.userID).toBe("user-123");
    });
});