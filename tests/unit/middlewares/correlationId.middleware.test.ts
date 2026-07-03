import { correlationId } from "../../../src/middlewares/correlationId.middleware";
import { Request, Response, NextFunction } from "express";

describe("correlationId Middleware", () => {
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockResponse = { setHeader: jest.fn() };
    nextFunction = jest.fn();
  });

  it("reuses the incoming x-request-id header if present", () => {
    const mockRequest: Partial<Request> = {
      headers: { "x-request-id": "client-supplied-id" },
    };

    correlationId(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction,
    );

    expect(mockRequest.headers?.["x-request-id"]).toBe("client-supplied-id");
    expect(mockResponse.setHeader).toHaveBeenCalledWith(
      "x-request-id",
      "client-supplied-id",
    );
    expect(nextFunction).toHaveBeenCalled();
  });

  it("generates a new UUID when no header is present", () => {
    const mockRequest: Partial<Request> = { headers: {} };

    correlationId(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction,
    );

    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    expect(mockRequest.headers?.["x-request-id"]).toMatch(uuidRegex);
    expect(nextFunction).toHaveBeenCalled();
  });
});
