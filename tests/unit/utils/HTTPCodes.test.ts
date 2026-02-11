import { HTTPCodes } from "../../../src/utils/HTTPCodes";

describe("HTTPCodes", () => {
  it("maps common status codes correctly", () => {
    expect(HTTPCodes.OK).toBe(200);
    expect(HTTPCodes.BadRequest).toBe(400);
    expect(HTTPCodes.InternalServerError).toBe(500);
  });
});

