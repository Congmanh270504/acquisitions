import logger from "#config/logger.ts";
import jwt, { type SignOptions } from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-jwt-secret";
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN ||
    "1d") as SignOptions["expiresIn"];

export const jwtToken = {
    sign: (payload: any) => {
        try {
            return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
        } catch (error) {
            logger.error("Failed to authenticate token", error);
            throw new Error("Failed to authenticate token");
        }
    },
    verify: (token: any) => {
        try {
            return jwt.verify(token, JWT_SECRET);
        } catch (error) {
            logger.error("Failed to authenticate token", error);
            throw new Error("Failed to authenticate token");
        }
    },
};
