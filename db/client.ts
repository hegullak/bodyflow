import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

type DrizzleClient = ReturnType<typeof drizzle<typeof schema>>;

let cached: DrizzleClient | null = null;

export function getDb(): DrizzleClient {
  if (cached) return cached;
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.");
  }
  const sql = neon(process.env.DATABASE_URL);
  cached = drizzle({ client: sql, schema, casing: "snake_case" });
  return cached;
}

export { schema };
export type Db = DrizzleClient;
