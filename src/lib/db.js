// src/lib/db.js
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis;

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.warn("⚠️ DATABASE_URL is not set");
}

const pool =
  globalForPrisma.__pgPool ??
  new Pool({
    connectionString: databaseUrl,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.__pgPool = pool;
}

const adapter = new PrismaPg(pool);

export const prisma =
  globalForPrisma.__prisma ??
  new PrismaClient({
    adapter,
    log: ["warn", "error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.__prisma = prisma;
}
