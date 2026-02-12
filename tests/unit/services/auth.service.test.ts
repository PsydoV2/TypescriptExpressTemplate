import { AuthService } from "../../../src/services/auth.service";
import { UserRepository } from "../../../src/repositories/user.repository";
import { ApiError } from "../../../src/utils/ApiError";

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
        // Mock: Simuliere, dass findUserByEmail einen User findet
        (UserRepository.findUserByEmail as jest.Mock).mockResolvedValue({ userID: "123" });

        await expect(AuthService.registerUser("testuser", "duplicate@test.com", "password123"))
            .rejects
            .toThrow(ApiError);

        // Prüfen, ob der Statuscode 409 (Conflict) ist
        try {
            await AuthService.registerUser("testuser", "duplicate@test.com", "password123");
        } catch (error: any) {
            expect(error.status).toBe(409);
            expect(error.message).toBe("E-mail already exists");
        }
    });
});