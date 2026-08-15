import { correlationId } from "../../../src/middlewares/correlationId.middleware";
import { getRequestMeta } from "../../../src/utils/RequestContext";
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
      ip: "203.0.113.5",
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

  it("stores the request's IP in the request context", () => {
    const mockRequest: Partial<Request> = {
      headers: {},
      ip: "198.51.100.7",
    };
    let metaSeen: ReturnType<typeof getRequestMeta> | undefined;
    const next: NextFunction = () => {
      metaSeen = getRequestMeta();
    };

    correlationId(mockRequest as Request, mockResponse as Response, next);

    expect(metaSeen).toEqual({ ip: "198.51.100.7", identity: "anonymous" });
  });

  it("falls back to 'unknown' IP when req.ip is not set", () => {
    const mockRequest: Partial<Request> = { headers: {} };
    let metaSeen: ReturnType<typeof getRequestMeta> | undefined;
    const next: NextFunction = () => {
      metaSeen = getRequestMeta();
    };

    correlationId(mockRequest as Request, mockResponse as Response, next);

    expect(metaSeen).toEqual({ ip: "unknown", identity: "anonymous" });
  });
});
