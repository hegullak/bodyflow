import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./db/schema",
  out: "./db/migrations",
  dialect: "postgresql",
  schemaFilter: ["bodyflow"],
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://localhost/placeholder",
  },
  strict: true,
  verbose: true,
});
