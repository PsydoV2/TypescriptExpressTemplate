import { UserService } from "../../../src/services/user.service";
import { UserRepository } from "../../../src/repositories/user.repository";

jest.mock("../../../src/repositories/user.repository");

describe("UserService - getUser", () => {
    it("should throw 404 error if user does not exist", async () => {
        // Mock: Repository gibt null zurück
        (UserRepository.findUserByID as jest.Mock).mockResolvedValue(null);

        await expect(UserService.getUser("unknown-id"))
            .rejects
            .toThrow("User not found");
    });
});