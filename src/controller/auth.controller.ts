import { type Request, type Response, type NextFunction } from "express";
import { signInSchema, signUpSchema } from "../validation/auth.validation";
import { formatValidationError } from "#utils/format.ts";
import logger from "#config/logger.ts";
import { authenticateUser, createUser } from "#services/auth.service.ts";
import { jwtToken } from "#utils/jwt.ts";
import { cookies } from "#utils/cookies.ts";

export const signUp = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const validationResult = signUpSchema.safeParse(req.body);

        if (!validationResult.success) {
            return res.status(400).send({
                error: "Validation failed",
                details: formatValidationError(validationResult.error),
            });
        }

        const createNewUser = await createUser(validationResult.data);

        const token = jwtToken.sign({
            id: createNewUser.id,
            name: createNewUser.name,
            email: createNewUser.email,
            role: createNewUser.role,
        });

        cookies.set(res, "token", token);

        logger.info("User registered successfully: " + createNewUser.email);
        res.status(200).json({
            message: "User registered",
            user: {
                id: createNewUser.id,
                name: createNewUser.name,
                email: createNewUser.email,
                role: createNewUser.role,
                createdAt: createNewUser.createdAt,
            },
        });
    } catch (error) {
        logger.error("Signup error", error);
        const result = (error as Error).message;
        if (result === "User with this email already exist") {
            return res.status(400).json({ error: "Email already exist" });
        }

        next(error);
    }
};

export const signIn = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const validationResult = signInSchema.safeParse(req.body);

        if (!validationResult.success) {
            return res.status(400).send({
                error: "Validation failed",
                details: formatValidationError(validationResult.error),
            });
        }

        const user = await authenticateUser(validationResult.data);

        const token = jwtToken.sign({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
        });

        cookies.set(res, "token", token);

        logger.info("User signed in successfully: " + user.email);
        res.status(200).json({
            message: "Sign-in successfully",
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                createdAt: user.createdAt,
            },
        });
    } catch (error) {
        logger.error("Sign-in error", error);
        const result = (error as Error).message;
        if (result === "Invalid email or password") {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        next(error);
    }
};

export const signOut = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        cookies.clear(res, "token");

        logger.info("User signed out successfully");
        res.status(200).json({
            message: "Sign-out successfully",
        });
    } catch (error) {
        logger.error("Sign-out error", error);
        next(error);
    }
};

