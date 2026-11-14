import z, { email } from "zod";

export const signUpSchema = z.object({
    name: z
        .string()
        .min(2, "Name at lest 2 characters")
        .max(255, "Name can't more than 255 characters")
        .trim(),
    email: z.email().toLowerCase(),
    password: z
        .string()
        .min(6, "Password at lest 6 characters")
        .max(20, "Password can't more than 20 characters"),
    role: z.enum(["admin", "user"]).default("user"),
});

export const signInSchema = z.object({
    email: z.email().toLowerCase(),
    password: z
        .string()
        .min(6, "Password at lest 6 characters")
        .max(20, "Password can't more than 20 characters"),
});
