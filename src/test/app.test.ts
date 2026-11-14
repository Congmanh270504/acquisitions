import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "#src/app.ts";

describe("API Enpoints", () => {
    describe("GET /health", () => {
        it("should return health status", async () => {
            const res = await request(app).get("/health").expect(200);
            expect(res.body).toHaveProperty("status", "OK");
            expect(res.body).toHaveProperty("timestamp");
            expect(res.body).toHaveProperty("uptime");
        });
    });
    describe("GET /api", () => {
        it("should return API message", async () => {
            const res = await request(app).get("/api").expect(200);
            expect(res.body).toHaveProperty(
                "message",
                "Accquistions is running",
            );
        });
    });
    describe("GET /nonExistent", () => {
        it("should return 404 for non-existent route", async () => {
            const res = await request(app).get("/nonExistent").expect(404);
            expect(res.body).toHaveProperty("error", "Route not found");
        });
    });
});
