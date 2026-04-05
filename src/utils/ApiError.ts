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

    // Required for proper "instanceof" checks when extending Error
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}
