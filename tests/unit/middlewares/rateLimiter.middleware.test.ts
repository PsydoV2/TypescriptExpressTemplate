import { globalRateLimit } from "../../../src/middlewares/rateLimiter.middleware";
import { Request, Response, NextFunction } from "express";
import { RateLimiterMemory } from "rate-limiter-flexible";

// Wir mocken den consume-Aufruf, um einen Block zu simulieren
describe("rateLimiter Middleware", () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let nextFunction: NextFunction;

    beforeEach(() => {
        mockRequest = { ip: "127.0.0.1" };
        mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            set: jest.fn(),
        };
        nextFunction = jest.fn();
    });

    it("should return 429 when rate limit is exceeded", async () => {
        // Wir simulieren einen Fehler vom Limiter (zu viele Anfragen)
        const consumeError = { msBeforeNext: 5000 };
        jest.spyOn(RateLimiterMemory.prototype, 'consume').mockRejectedValue(consumeError);

        await globalRateLimit(mockRequest as Request, mockResponse as Response, nextFunction);

        expect(mockResponse.status).toHaveBeenCalledWith(429);
        expect(mockResponse.set).toHaveBeenCalledWith("Retry-After", "5");
    });
});