import winston from "winston";

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || "info",
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
    ),
    defaultMeta: { service: "acquisitions-api" },
    transports: [
        // Luôn ghi ra Console để Docker và Kubernetes (kubectl logs) bắt được log
        new winston.transports.Console({
            format:
                process.env.NODE_ENV === "production"
                    ? winston.format.json()
                    : winston.format.combine(
                          winston.format.colorize(),
                          winston.format.simple(),
                      ),
        }),
        // Ghi ra file trong thư mục logs
        new winston.transports.File({
            filename: "logs/error.log",
            level: "error",
        }),
        new winston.transports.File({
            filename: "logs/combined.log",
        }),
    ],
});

export default logger;
