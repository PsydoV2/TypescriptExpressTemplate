import { ApiError } from "../../../src/utils/apiError.util";
import { HTTPCodes } from "../../../src/utils/httpCodes.util";
import { ErrorCode } from "../../../src/utils/errorCodes.util";

describe("ApiError", () => {
  it("sets status, code and message", () => {
    const err = new ApiError(
      HTTPCodes.BadRequest,
      ErrorCode.MISSING_PARAMETERS,
      "bad request",
    );

    expect(err).toBeInstanceOf(Error);
    expect(err.status).toBe(HTTPCodes.BadRequest);
    expect(err.code).toBe(ErrorCode.MISSING_PARAMETERS);
    expect(err.message).toBe("bad request");
  });
});
