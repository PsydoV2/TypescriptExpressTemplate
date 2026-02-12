import { deleteUserSchema, getUserSchema } from "../../../src/schemas/user.schema";

describe("User Schemas", () => {
    describe("deleteUserSchema", () => {
        it("should fail if reason is shorter than 10 chars", async () => {
            const result = await deleteUserSchema.safeParseAsync({
                body: { userID: "1c1645cc-0789-11f1-96b2-02016e4234e7", reason: "too short" }
            });
            expect(result.success).toBe(false);
        });
    });

    describe("getUserSchema", () => {
        it("should fail if userID is not a valid UUID", async () => {
            const result = await getUserSchema.safeParseAsync({
                query: { userID: "123-not-a-uuid" }
            });
            expect(result.success).toBe(false);
        });

        it("should succeed with a valid UUID in query", async () => {
            const result = await getUserSchema.safeParseAsync({
                query: { userID: "1c1645cc-0789-11f1-96b2-02016e4234e7" }
            });
            expect(result.success).toBe(true);
        });
    });
});