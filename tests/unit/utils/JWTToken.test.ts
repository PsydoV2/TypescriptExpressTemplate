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
    const signed = jwt.sign(
      { userID: "550e8400-e29b-41d4-a716-446655440000" },
      secret,
      { expiresIn: "1h" },
    );
    const payload = JWTToken.verifyAuthToken(signed);
    expect(payload?.userID).toBe("550e8400-e29b-41d4-a716-446655440000");
  });

  it("returns undefined for an invalid token", () => {
    const payload = JWTToken.verifyAuthToken("invalid.token");
    expect(payload).toBeUndefined();
  });

  it("rejects a password-reset token used as an auth token", () => {
    const resetToken = JWTToken.generatePasswordResetToken("user-123", "30m");
    const payload = JWTToken.verifyAuthToken(resetToken);
    expect(payload).toBeUndefined();
  });
});

describe("JWTToken password reset tokens", () => {
  beforeEach(() => {
    process.env.SECRETKEYJWT = "test-secret";
  });

  it("round-trips a valid password reset token", () => {
    const token = JWTToken.generatePasswordResetToken("user-123", "30m");
    expect(JWTToken.verifyPasswordResetToken(token)).toBe("user-123");
  });

  it("rejects a regular auth token used as a password reset token", () => {
    const authToken = JWTToken.generateAuthToken("user-123", "1h");
    expect(JWTToken.verifyPasswordResetToken(authToken)).toBeUndefined();
  });

  it("returns undefined for an invalid token", () => {
    expect(JWTToken.verifyPasswordResetToken("invalid.token")).toBeUndefined();
  });
});
