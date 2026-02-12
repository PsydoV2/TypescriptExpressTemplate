import { z } from "zod";

export const deleteUserSchema = z.object({
    body: z.object({
        userID: z.uuid("Invalid User ID format"),
        reason: z.string()
            .min(10, "Reason too short")
            .max(255, "Reason too long"),
    })
});

export const getUserSchema = z.object({
    query: z.object({
        userID: z.uuid("Invalid User ID format"),
    })
});

export type DeleteUserInput = z.infer<typeof deleteUserSchema>["body"];
export type GetUserInput = z.infer<typeof getUserSchema>["query"];