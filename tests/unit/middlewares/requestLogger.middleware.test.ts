import { EventEmitter } from "node:events";
import { globalRequestLogger } from "../../../src/middlewares/requestLogger.middleware";
import { LogHelper } from "../../../src/helper/log.helper";
import { Request, Response, NextFunction } from "express";

jest.mock("../../../src/helper/log.helper", () => ({
  LogHelper: { logRequest: jest.fn(), logError: jest.fn() },
  LogSeverity: { WARNING: "warning" },
}));

function mockResponse(statusCode = 200): Response & EventEmitter {
  const emitter = new EventEmitter() as Response & EventEmitter;
  (emitter as unknown as { statusCode: number }).statusCode = statusCode;
  return emitter;
}

describe("globalRequestLogger", () => {
  let nextFunction: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();
    nextFunction = jest.fn();
  });

  it("skips logging entirely for OPTIONS requests", () => {
    const req = { method: "OPTIONS", path: "/foo", originalUrl: "/foo" };
    const res = mockResponse();

    globalRequestLogger(req as unknown as Request, res, nextFunction);

    expect(nextFunction).toHaveBeenCalled();
    expect(LogHelper.logRequest).not.toHaveBeenCalled();

    res.emit("finish");
    expect(LogHelper.logRequest).not.toHaveBeenCalled();
  });

  it("uses req.originalUrl (not req.path) as the logged route", () => {
    const req = {
      method: "GET",
      path: "/foo", // as it would appear after sub-router rewriting
      originalUrl: "/api/v1/admin/foo",
      query: {},
    };
    const res = mockResponse();

    globalRequestLogger(req as unknown as Request, res, nextFunction);
    res.emit("finish");

    expect(LogHelper.logRequest).toHaveBeenCalledWith(
      "/api/v1/admin/foo",
      expect.any(String),
    );
  });

  it("falls back to req.path when originalUrl is missing", () => {
    const req = { method: "GET", path: "/foo", query: {} };
    const res = mockResponse();

    globalRequestLogger(req as unknown as Request, res, nextFunction);
    res.emit("finish");

    expect(LogHelper.logRequest).toHaveBeenCalledWith(
      "/foo",
      expect.any(String),
    );
  });

  it("calls next() synchronously, before the response finishes", () => {
    const req = { method: "GET", path: "/foo", originalUrl: "/foo", query: {} };
    const res = mockResponse();

    globalRequestLogger(req as unknown as Request, res, nextFunction);

    expect(nextFunction).toHaveBeenCalled();
    expect(LogHelper.logRequest).not.toHaveBeenCalled();
  });

  it("logs the payload including the response status code once finished", () => {
    const req = {
      method: "POST",
      path: "/foo",
      originalUrl: "/foo",
      body: { username: "test" },
    };
    const res = mockResponse(201);

    globalRequestLogger(req as unknown as Request, res, nextFunction);
    res.emit("finish");

    expect(LogHelper.logRequest).toHaveBeenCalledWith(
      "/foo",
      `status=201 | ${JSON.stringify({ username: "test" })}`,
    );
  });

  it("redacts sensitive fields in the logged payload", () => {
    const req = {
      method: "POST",
      path: "/foo",
      originalUrl: "/foo",
      body: { username: "test", password: "secret123" },
    };
    const res = mockResponse(200);

    globalRequestLogger(req as unknown as Request, res, nextFunction);
    res.emit("finish");

    const [, payload] = (LogHelper.logRequest as jest.Mock).mock.calls[0];
    expect(payload).toContain("[REDACTED]");
    expect(payload).not.toContain("secret123");
  });
});
