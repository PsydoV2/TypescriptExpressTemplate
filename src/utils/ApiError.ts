import { HTTPCodes } from "./HTTPCodes";
import { ErrorCode } from "./ErrorCodes";

/**
 * Custom API Error class.
 * - Extends the built-in Error object.
 * - Adds an HTTP status code and a machine-readable error code.
 * - Useful for throwing consistent errors across services and controllers.
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
