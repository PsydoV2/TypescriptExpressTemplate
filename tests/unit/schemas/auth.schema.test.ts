import { registerSchema } from "../../../src/schemas/auth.schema";

describe("authSchema (Register)", () => {

    const validData = {
        body: {
            username: "MaxMustermann",
            email: "max@test.com",
            password: "SafePassword123"
        }
    };

    it("should validate a correct registration object", async () => {
        const result = await registerSchema.safeParseAsync(validData);
        expect(result.success).toBe(true);
    });

    it("should fail if username is too short", async () => {
        const invalidData = {
            body: { ...validData.body, username: "ab" }
        };
        const result = await registerSchema.safeParseAsync(invalidData);

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues[0].message).toBe("Username must be at least 3 characters long");
        }
    });

    it("should fail if email is malformed", async () => {
        const invalidData = {
            body: { ...validData.body, email: "not-an-email" }
        };
        const result = await registerSchema.safeParseAsync(invalidData);

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues[0].message).toBe("Invalid email format");
        }
    });

    describe("Password Validation", () => {
        it("should fail if password is too short", async () => {
            const result = await registerSchema.safeParseAsync({
                body: { ...validData.body, password: "Short1" }
            });
            expect(result.success).toBe(false);
        });

        it("should fail if password lacks an uppercase letter", async () => {
            const result = await registerSchema.safeParseAsync({
                body: { ...validData.body, password: "password123" }
            });
            expect(result.success).toBe(false);
        });

        it("should fail if password lacks a number", async () => {
            const result = await registerSchema.safeParseAsync({
                body: { ...validData.body, password: "SafePassword" }
            });
            expect(result.success).toBe(false);
        });
    });
});