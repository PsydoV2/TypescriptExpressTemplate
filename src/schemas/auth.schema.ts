import { z } from "zod";

// Gemeinsame Passwort-Regel
const passwordSchema = z.string()
    .min(8, "Password must be at least 8 characters long")
    .max(32, "Password too long")
    .regex(/[A-Z]/, "Password needs one uppercase letter")
    .regex(/[0-9]/, "Password needs one number");

export const registerSchema = z.object({
    body: z.object({
        username: z.string()
            .min(3, "Username must be at least 3 characters long")
            .max(20, "Username too long"),
        email: z.email("Invalid email format"),
        password: passwordSchema
    })
});

export const loginSchema = z.object({
    body: z.object({
        emailOrUsername: z.string()
            .min(3, "Input too short")
            .max(255, "Input too long"),
        password: z.string().min(1, "Password is required")
    })
});

export type RegisterInput = z.infer<typeof registerSchema>["body"];
export type LoginInput = z.infer<typeof loginSchema>["body"];