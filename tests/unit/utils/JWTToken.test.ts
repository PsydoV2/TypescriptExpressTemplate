import jwt from "jsonwebtoken";
import { JWTToken } from "../../../src/utils/JWTToken";

describe("JWTToken.extractTokenFromHeader", () => {
  it("returns the token for a valid Bearer header", () => {
    const token = JWTToken.extractTokenFromHeader("Bearer abc.def.ghi");
    expect(token).toBe("abc.def.ghi");
  });

  it("returns undefined for an empty header", () => {
    const token = JWTToken.extractTokenFromHeader(undefined);
    expect(token).toBeUndefined();
  });

  it("returns undefined for a malformed header", () => {
    const token = JWTToken.extractTokenFromHeader("NotBearer token");
    expect(token).toBeUndefined();
  });
});

describe("JWTToken.verifyAuthToken", () => {
  const secret = "test-secret";

  beforeEach(() => {
    process.env.SECRETKEYJWT = secret;
  });

  it("returns payload for a valid token", () => {
    const signed = jwt.sign({ userID: 123 }, secret, { expiresIn: "1h" });
    const payload = JWTToken.verifyAuthToken(signed);
    expect(payload?.userID).toBe(123);
  });

  it("returns undefined for an invalid token", () => {
    const payload = JWTToken.verifyAuthToken("invalid.token");
    expect(payload).toBeUndefined();
  });
});

