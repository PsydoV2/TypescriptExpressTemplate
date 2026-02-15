import { validate } from "../../../src/middlewares/validate.middleware";
import { z } from "zod";
import { Request, Response, NextFunction } from "express";

describe("validate Middleware", () => {
    const testSchema = z.object({
        body: z.object({
            name: z.string().min(3)
        })
    });

    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let nextFunction: NextFunction;

    beforeEach(() => {
        mockResponse = {};
        nextFunction = jest.fn();
    });

    it("should call next() if data matches schema", async () => {
        mockRequest = { body: { name: "ValidName" } };
        await validate(testSchema)(mockRequest as Request, mockResponse as Response, nextFunction);
        expect(nextFunction).toHaveBeenCalledWith();
    });

    it("should call next(error) if data is invalid", async () => {
        mockRequest = { body: { name: "ab" } }; // Zu kurz
        await validate(testSchema)(mockRequest as Request, mockResponse as Response, nextFunction);

        // Es sollte mit einem ApiError aufgerufen werden
        expect(nextFunction).toHaveBeenCalledWith(expect.objectContaining({
            status: 400
        }));
    });
});