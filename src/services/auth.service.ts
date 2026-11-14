import logger from "#config/logger.ts";
import bcrypt from "bcrypt";
import { UserAuth, UserSignIn } from "../types/auth.type";
import { db } from "#config/database.ts";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";

export const hashPassword = async (password: string) => {
    try {
        return await bcrypt.hash(password, 10);
    } catch (error) {
        logger.error("Error hasing the password" + error);
        throw new Error("Error hashing");
    }
};

export const comparePassword = async (password: string, hash: string) => {
    try {
        return await bcrypt.compare(password, hash);
    } catch (error) {
        logger.error("Error comparing the password" + error);
        throw new Error("Error comparing password");
    }
};

export const createUser = async (userData: UserAuth) => {
    try {
        const isExistingUser = await db
            .select()
            .from(users)
            .where(eq(users.email, userData.email))
            .limit(1);

        if (isExistingUser.length > 0)
            throw new Error("User with this email already exist");

        const hashingPassword = await hashPassword(userData.password);

        const [newUser] = await db
            .insert(users)
            .values({
                ...userData,
                password: hashingPassword,
                role: userData.role as "user" | "admin",
            })
            .returning({
                id: users.id,
                name: users.name,
                email: users.email,
                role: users.role,
                createdAt: users.createdAt,
            });

        logger.info("Created new user successfully", newUser);

        return newUser;
    } catch (error) {
        logger.error("Error creating the user" + error);
        throw error;
    }
};

export const authenticateUser = async ({ email, password }: UserSignIn) => {
    try {
        const [user] = await db
            .select()
            .from(users)
            .where(eq(users.email, email))
            .limit(1);

        if (!user) {
            throw new Error("Invalid email or password");
        }

        const isPasswordValid = await comparePassword(password, user.password);

        if (!isPasswordValid) {
            throw new Error("Invalid email or password");
        }

        return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            createdAt: user.createdAt,
        };
    } catch (error) {
        logger.error("Error authenticating the user" + error);
        throw error;
    }
};
