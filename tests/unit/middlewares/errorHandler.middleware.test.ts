import { errorHandler } from "../../../src/middlewares/errorHandler.middleware";
import { ApiError } from "../../../src/utils/ApiError";
import { LogHelper } from "../../../src/utils/LogHelper";
import { HTTPCodes } from "../../../src/utils/HTTPCodes";
import { Request, Response, NextFunction } from "express";

jest.mock("../../../src/utils/LogHelper");

describe("errorHandler Middleware", () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let nextFunction: NextFunction = jest.fn();

    beforeEach(() => {
        mockRequest = { originalUrl: "/test-route", url: "/test-route" };
        mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        jest.clearAllMocks();
    });

    it("should handle ApiError and return specific status code", async () => {
        const error = new ApiError(HTTPCodes.Conflict, "Conflict detected");

        await errorHandler(error, mockRequest as Request, mockResponse as Response, nextFunction);

        expect(LogHelper.logError).toHaveBeenCalled();
        expect(mockResponse.status).toHaveBeenCalledWith(HTTPCodes.Conflict);
        expect(mockResponse.json).toHaveBeenCalledWith({ message: "Conflict detected" });
    });

    it("should handle unknown errors and return 500", async () => {
        const error = new Error("Generic crash");

        await errorHandler(error, mockRequest as Request, mockResponse as Response, nextFunction);

        expect(mockResponse.status).toHaveBeenCalledWith(HTTPCodes.InternalServerError);
        expect(mockResponse.json).toHaveBeenCalledWith({ message: "Internal server error" });
    });
});