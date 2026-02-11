import { ApiError } from "../../../src/utils/ApiError";
import { HTTPCodes } from "../../../src/utils/HTTPCodes";

describe("ApiError", () => {
  it("sets status and message", () => {
    const err = new ApiError(HTTPCodes.BadRequest, "bad request");

    expect(err).toBeInstanceOf(Error);
    expect(err.status).toBe(HTTPCodes.BadRequest);
    expect(err.message).toBe("bad request");
  });
});

