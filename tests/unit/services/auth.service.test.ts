import { AuthService } from "../../../src/services/auth.service";
import { UserRepository } from "../../../src/repositories/user.repository";
import { RefreshTokenRepository } from "../../../src/repositories/refreshToken.repository";
import { EmailHelper } from "../../../src/helper/EmailHelper";
import { ApiError } from "../../../src/utils/ApiError";
import { DBConnectionPool } from "../../../src/config/DBConnectionPool";

jest.mock("../../../src/repositories/user.repository");
jest.mock("../../../src/repositories/refreshToken.repository");
jest.mock("../../../src/helper/EmailHelper");
jest.mock("../../../src/config/DBConnectionPool", () => ({
  DBConnectionPool: {
    getConnection: jest.fn().mockResolvedValue({
      beginTransaction: jest.fn(),
      commit: jest.fn(),
      rollback: jest.fn(),
      release: jest.fn(),
    }),
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
  (RefreshTokenRepository.create as jest.Mock).mockResolvedValue(
    "raw-refresh-token",
  );
  (EmailHelper.sendEmailFromTemplate as jest.Mock).mockResolvedValue(undefined);
});

describe("AuthService - registerUser", () => {
  it("should throw a Conflict error if the email already exists", async () => {
    // Mock: findUserByEmail resolves an existing user
    (UserRepository.findUserByEmail as jest.Mock).mockResolvedValue({
      userID: "123",
    });

    await expect(
      AuthService.registerUser("testuser", "duplicate@test.com", "password123"),
    ).rejects.toThrow(ApiError);

    // Check that the status code is 409 (Conflict)
    try {
      await AuthService.registerUser(
        "testuser",
        "duplicate@test.com",
        "password123",
      );
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).status).toBe(409);
      expect((error as ApiError).message).toBe("E-mail already exists");
    }
  });

  it("should rollback transaction if repository fails during registration", async () => {
    const mockConn = {
      beginTransaction: jest.fn(),
      commit: jest.fn(),
      rollback: jest.fn(),
      release: jest.fn(),
      query: jest.fn(),
    };

    // Connection is obtained successfully, but the insert fails
    (DBConnectionPool.getConnection as jest.Mock).mockResolvedValue(mockConn);
    (UserRepository.findUserByEmail as jest.Mock).mockResolvedValue(null);
    (UserRepository.createNewUser as jest.Mock).mockRejectedValue(
      new Error("SQL Error"),
    );

    await expect(
      AuthService.registerUser("test", "test@test.com", "Pass123!"),
    ).rejects.toThrow("SQL Error");

    // Rollback and release must both be called on failure
    expect(mockConn.rollback).toHaveBeenCalled();
    expect(mockConn.release).toHaveBeenCalled();
  });

  it("issues a refresh token and sends a welcome email on success", async () => {
    (UserRepository.findUserByEmail as jest.Mock).mockResolvedValue(null);
    (UserRepository.findUserByUsername as jest.Mock)
      .mockResolvedValueOnce(null) // existence check
      .mockResolvedValueOnce({ userID: "user-1" }); // re-fetch after insert
    (UserRepository.createNewUser as jest.Mock).mockResolvedValue(undefined);

    const result = await AuthService.registerUser(
      "newuser",
      "new@test.com",
      "Pass123!",
    );

    expect(result.refreshToken).toBe("raw-refresh-token");
    expect(EmailHelper.sendEmailFromTemplate).toHaveBeenCalledWith(
      expect.objectContaining({ to: "new@test.com", templateName: "welcome" }),
    );
  });

  it("does not fail registration if the welcome email fails to send", async () => {
    (UserRepository.findUserByEmail as jest.Mock).mockResolvedValue(null);
    (UserRepository.findUserByUsername as jest.Mock)
      .mockResolvedValueOnce(null) // existence check
      .mockResolvedValueOnce({ userID: "user-1" }); // re-fetch after insert
    (UserRepository.createNewUser as jest.Mock).mockResolvedValue(undefined);
    (EmailHelper.sendEmailFromTemplate as jest.Mock).mockRejectedValue(
      new Error("SMTP down"),
    );

    await expect(
      AuthService.registerUser("newuser", "new@test.com", "Pass123!"),
    ).resolves.toEqual(
      expect.objectContaining({ refreshToken: "raw-refresh-token" }),
    );
  });
});

describe("AuthService.refreshAccessToken", () => {
  it("issues a new access token for a valid refresh token", async () => {
    (RefreshTokenRepository.findByToken as jest.Mock).mockResolvedValue({
      userID: "user-1",
      expired: false,
    });

    const result = await AuthService.refreshAccessToken("valid-token");
    expect(result.token).toEqual(expect.any(String));
  });

  it("throws for an unknown refresh token", async () => {
    (RefreshTokenRepository.findByToken as jest.Mock).mockResolvedValue(null);

    await expect(
      AuthService.refreshAccessToken("unknown-token"),
    ).rejects.toMatchObject({ status: 401, code: "INVALID_REFRESH_TOKEN" });
  });

  it("throws for an expired refresh token", async () => {
    (RefreshTokenRepository.findByToken as jest.Mock).mockResolvedValue({
      userID: "user-1",
      expired: true,
    });

    await expect(
      AuthService.refreshAccessToken("expired-token"),
    ).rejects.toMatchObject({ status: 401, code: "REFRESH_TOKEN_EXPIRED" });
  });
});

describe("AuthService.logout", () => {
  it("revokes the given refresh token", async () => {
    (RefreshTokenRepository.revoke as jest.Mock).mockResolvedValue(undefined);

    const result = await AuthService.logout("some-token");

    expect(RefreshTokenRepository.revoke).toHaveBeenCalledWith("some-token");
    expect(result).toEqual({ success: true });
  });
});

describe("AuthService.requestPasswordReset", () => {
  it("sends a reset email when the account exists", async () => {
    (UserRepository.findUserByEmail as jest.Mock).mockResolvedValue({
      userID: "user-1",
      username: "existinguser",
      email: "existing@test.com",
    });

    const result = await AuthService.requestPasswordReset("existing@test.com");

    expect(result).toEqual({ success: true });
    expect(EmailHelper.sendEmailFromTemplate).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "existing@test.com",
        templateName: "password-reset",
      }),
    );
  });

  it("resolves the same way for an unknown email, without sending mail", async () => {
    (UserRepository.findUserByEmail as jest.Mock).mockResolvedValue(null);

    const result = await AuthService.requestPasswordReset("unknown@test.com");

    expect(result).toEqual({ success: true });
    expect(EmailHelper.sendEmailFromTemplate).not.toHaveBeenCalled();
  });
});

describe("AuthService.resetPassword", () => {
  it("updates the password for a valid reset token", async () => {
    const { JWTToken } = jest.requireActual("../../../src/utils/JWTToken");
    process.env.SECRETKEYJWT = "test-secret";
    const token = JWTToken.generatePasswordResetToken("user-1", "30m");

    (UserRepository.updatePasswordByID as jest.Mock).mockResolvedValue(
      undefined,
    );

    const result = await AuthService.resetPassword(token, "NewPass123!");

    expect(result).toEqual({ success: true });
    expect(UserRepository.updatePasswordByID).toHaveBeenCalledWith(
      "user-1",
      expect.any(String),
    );
  });

  it("throws for an invalid reset token", async () => {
    await expect(
      AuthService.resetPassword("garbage-token", "NewPass123!"),
    ).rejects.toMatchObject({ status: 401, code: "INVALID_RESET_TOKEN" });
  });
});
