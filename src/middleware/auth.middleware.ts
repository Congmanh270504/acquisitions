import { type Request, type Response, type NextFunction } from "express";
import { jwtToken } from "#utils/jwt.ts";
import { cookies } from "#utils/cookies.ts";
import logger from "#config/logger.ts";

export interface UserPayload {
    id: number;
    name: string;
    email: string;
    role: "user" | "admin";
    iat?: number;
    exp?: number;
}

declare global {
    namespace Express {
        interface Request {
            user?: UserPayload;
        }
    }
}

export const authenticateToken = (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    try {
        const cookieToken = cookies.get(req, "token");
        const authHeader = req.headers.authorization;
        const bearerToken =
            authHeader && authHeader.startsWith("Bearer ")
                ? authHeader.split(" ")[1]
                : undefined;

        const token = cookieToken || bearerToken;

        if (!token) {
            return res.status(401).json({ error: "Access token is required" });
        }

        const decoded = jwtToken.verify(token) as UserPayload;
        req.user = decoded;
        next();
    } catch (error) {
        logger.error("Authentication error: ", error);
        return res.status(403).json({ error: "Invalid or expired token" });
    }
};

export const requireRole = (roles: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user || !req.user.role) {
            return res.status(401).json({ error: "Authentication required" });
        }

        if (!roles.includes(req.user.role)) {
            return res
                .status(403)
                .json({ error: "Access denied: insufficient permissions" });
        }

        next();
    };
};
