import z from "zod";

export const updateUserSchema = z.object({
    name: z
        .string()
        .min(2, "Name at least 2 characters")
        .max(255, "Name can't be more than 255 characters")
        .trim()
        .optional(),
    email: z.email().toLowerCase().optional(),
    password: z
        .string()
        .min(6, "Password at least 6 characters")
        .max(20, "Password can't be more than 20 characters")
        .optional(),
    role: z.enum(["admin", "user"]).optional(),
});
