import { type Request, type Response, type NextFunction } from "express";
import { updateUserSchema } from "../validation/user.validation.ts";
import { formatValidationError } from "#utils/format.ts";
import logger from "#config/logger.ts";
import {
    deleteUser,
    getAllUsers,
    getUserById,
    updateUser,
} from "#services/users.service.ts";

export const fetchAllUsers = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const users = await getAllUsers();
        res.status(200).json({
            message: "Fetched all users successfully",
            users,
        });
    } catch (error) {
        logger.error("Error in fetchAllUsers: ", error);
        next(error);
    }
};

export const fetchUserById = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const id = Number(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ error: "Invalid user ID" });
        }

        const user = await getUserById(id);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        res.status(200).json({
            message: "Fetched user successfully",
            user,
        });
    } catch (error) {
        logger.error(`Error in fetchUserById (${req.params.id}): `, error);
        next(error);
    }
};

export const updateUserById = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const id = Number(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ error: "Invalid user ID" });
        }

        // Authenticated user can only update their own profile, admin can update any
        if (req.user?.role !== "admin" && req.user?.id !== id) {
            return res.status(403).json({
                error: "Access denied: you can only update your own profile",
            });
        }

        const validationResult = updateUserSchema.safeParse(req.body);
        if (!validationResult.success) {
            return res.status(400).json({
                error: "Validation failed",
                details: formatValidationError(validationResult.error),
            });
        }

        // Only admin can change role
        if (req.user?.role !== "admin" && validationResult.data.role) {
            return res.status(403).json({
                error: "Access denied: only admin can modify user role",
            });
        }

        const updatedUser = await updateUser(id, validationResult.data);
        if (!updatedUser) {
            return res.status(404).json({ error: "User not found" });
        }

        res.status(200).json({
            message: "User updated successfully",
            user: updatedUser,
        });
    } catch (error) {
        logger.error(`Error in updateUserById (${req.params.id}): `, error);
        next(error);
    }
};

export const deleteUserById = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const id = Number(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ error: "Invalid user ID" });
        }

        const deletedUser = await deleteUser(id);
        if (!deletedUser) {
            return res.status(404).json({ error: "User not found" });
        }

        res.status(200).json({
            message: "User deleted successfully",
            user: deletedUser,
        });
    } catch (error) {
        logger.error(`Error in deleteUserById (${req.params.id}): `, error);
        next(error);
    }
};
