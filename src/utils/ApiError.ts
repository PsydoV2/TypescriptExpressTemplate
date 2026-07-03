import { HTTPCodes } from "./HTTPCodes";
import { ErrorCode } from "./ErrorCodes";

/**
 * Error carrying an HTTP status and a machine-readable code, so it can be
 * thrown anywhere and turned into a consistent JSON response by errorHandler.
 */
export class ApiError extends Error {
  public status: HTTPCodes;
  public code: ErrorCode;

  constructor(status: HTTPCodes, code: ErrorCode, message: string) {
    super(message);
    this.status = status;
    this.code = code;
    this.name = "ApiError";
    // Note: no Object.setPrototypeOf needed — the ES2020 target restores the
    // prototype chain correctly, so `instanceof ApiError` works out of the box.
  }
}
