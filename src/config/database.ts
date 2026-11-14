import "dotenv/config";
import { neon, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../db/schema.ts";

if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not defined in .env");
}

// When connecting to local Postgres / Neon Local proxy (not cloud neon.tech)
if (!process.env.DATABASE_URL.includes("neon.tech")) {
    neonConfig.fetchEndpoint = (host, port) => {
        const targetPort = port || 5432;
        return `http://${host}:${targetPort}/sql`;
    };
    neonConfig.useSecureWebSocket = false;
    neonConfig.poolQueryViaFetch = true;
}

const sql = neon(process.env.DATABASE_URL);
export const db = drizzle(sql, { schema });
