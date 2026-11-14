import "dotenv/config";
import logger from "#config/logger.ts";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import cors from "cors";
import cookiePaster from "cookie-parser";
import authRouter from "#routes/auth.route.ts";
import usersRouter from "#routes/users.route.js";

const app = express();

app.use(helmet());

app.use(cors());

app.use(express.json());

app.use(express.urlencoded({ extended: true }));

app.use(cookiePaster());

app.use(
    morgan("combined", {
        stream: { write: (messages) => logger.info(messages.trim()) },
    }),
);

app.get("/health", (req, res) => {
    res.status(200).send({
        status: "OK",
        message: "Accquistions is healthy",
        timestamp: new Date().toISOString(),
        createAt: new Date().toISOString(),
        uptime: process.uptime(),
    });
});

app.get("/api", (req, res) => {
    res.status(200).json({
        message: "Accquistions is running",
    });
});

app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);

app.use((req, res) => {
    res.status(404).json({ error: "Route not found" });
});

// Global Error Handling Middleware (bắt buộc phải có đủ 4 tham số)
app.use(
    (
        err: any,
        req: express.Request,
        res: express.Response,
        next: express.NextFunction,
    ) => {
        logger.error("Unhandled error: ", err);
        const statusCode = err.statusCode || 500;
        const message = err.message || "Internal Server Error";
        res.status(statusCode).json({
            error: message,
            // Nếu ở môi trường dev thì hiện thêm stack trace để debug, lên production thì ẩn đi
            ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
        });
    },
);

export default app;
