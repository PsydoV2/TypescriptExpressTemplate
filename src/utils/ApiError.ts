import { HTTPCodes } from "./HTTPCodes";

/**
 * Custom API Error class.
 * - Extends the built-in Error object.
 * - Adds an HTTP status code for easier error handling.
 * - Useful for throwing consistent errors across services and controllers.
 */
export class ApiError extends Error {
  public status: HTTPCodes;

  constructor(status: HTTPCodes, message: string) {
    super(message);
    this.status = status;

    // Required for proper "instanceof" checks when extending Error
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}
