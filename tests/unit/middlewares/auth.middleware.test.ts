import { authMiddleware } from "../../../src/middlewares/auth.middleware";
import { JWTToken } from "../../../src/utils/JWTToken";
import {
  runWithRequestId,
  getRequestMeta,
} from "../../../src/utils/RequestContext";
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
  const nextFunction: NextFunction = jest.fn();

  beforeEach(() => {
    mockRequest = { headers: {} };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  it("should return 401 if no authorization header is present", () => {
    authMiddleware(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction,
    );

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: "MISSING_TOKEN",
      }),
    );
  });

  it("should call next() if token is valid", () => {
    jest
      .spyOn(JWTToken, "extractTokenFromHeader")
      .mockReturnValue("valid-token");
    jest
      .spyOn(JWTToken, "verifyAuthToken")
      .mockReturnValue({ userID: "user-123" });

    authMiddleware(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction,
    );

    expect(nextFunction).toHaveBeenCalled();
    expect(mockRequest.userID).toBe("user-123");
  });

  it("sets the request identity once the token is verified", () => {
    jest
      .spyOn(JWTToken, "extractTokenFromHeader")
      .mockReturnValue("valid-token");
    jest
      .spyOn(JWTToken, "verifyAuthToken")
      .mockReturnValue({ userID: "user-123" });

    let identitySeen: string | undefined;
    runWithRequestId("req-1", () => {
      authMiddleware(mockRequest as Request, mockResponse as Response, () => {
        identitySeen = getRequestMeta().identity;
      });
    });

    expect(identitySeen).toBe("user:user-123");
  });
});
