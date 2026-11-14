import logger from "#config/logger.ts";
import { db } from "#config/database.ts";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";
import { hashPassword } from "#services/auth.service.ts";

export const getAllUsers = async () => {
    try {
        const result = await db
            .select({
                id: users.id,
                name: users.name,
                email: users.email,
                role: users.role,
                createdAt: users.createdAt,
                updatedAt: users.updatedAt,
            })
            .from(users);

        return result;
    } catch (error) {
        logger.error("Error fetching all users: ", error);
        throw error;
    }
};

export const getUserById = async (id: number) => {
    try {
        const [user] = await db
            .select({
                id: users.id,
                name: users.name,
                email: users.email,
                role: users.role,
                createdAt: users.createdAt,
                updatedAt: users.updatedAt,
            })
            .from(users)
            .where(eq(users.id, id))
            .limit(1);

        return user || null;
    } catch (error) {
        logger.error(`Error fetching user by ID ${id}: `, error);
        throw error;
    }
};

export const updateUser = async (
    id: number,
    data: {
        name?: string;
        email?: string;
        password?: string;
        role?: "user" | "admin";
    },
) => {
    try {
        const updatePayload: Record<string, any> = {
            updatedAt: new Date(),
        };

        if (data.name !== undefined) updatePayload.name = data.name;
        if (data.email !== undefined) updatePayload.email = data.email;
        if (data.role !== undefined) updatePayload.role = data.role;
        if (data.password !== undefined) {
            updatePayload.password = await hashPassword(data.password);
        }

        const [updatedUser] = await db
            .update(users)
            .set(updatePayload)
            .where(eq(users.id, id))
            .returning({
                id: users.id,
                name: users.name,
                email: users.email,
                role: users.role,
                createdAt: users.createdAt,
                updatedAt: users.updatedAt,
            });

        return updatedUser || null;
    } catch (error) {
        logger.error(`Error updating user ${id}: `, error);
        throw error;
    }
};

export const deleteUser = async (id: number) => {
    try {
        const [deletedUser] = await db
            .delete(users)
            .where(eq(users.id, id))
            .returning({
                id: users.id,
                name: users.name,
                email: users.email,
            });

        return deletedUser || null;
    } catch (error) {
        logger.error(`Error deleting user ${id}: `, error);
        throw error;
    }
};
