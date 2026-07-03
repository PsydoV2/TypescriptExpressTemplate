import { AuthService } from "../../../src/services/auth.service";
import { UserRepository } from "../../../src/repositories/user.repository";
import { ApiError } from "../../../src/utils/ApiError";
import { DBConnectionPool } from "../../../src/config/DBConnectionPool";

jest.mock("../../../src/repositories/user.repository");
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
});
