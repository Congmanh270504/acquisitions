import {
    pgEnum,
    pgTable,
    primaryKey,
    serial,
    text,
    timestamp,
    varchar,
} from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("roles", ["user", "admin"]);

export const users = pgTable("users", {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    password: varchar("password", { length: 255 }).notNull().unique(),
    role: roleEnum("role").default("user"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

