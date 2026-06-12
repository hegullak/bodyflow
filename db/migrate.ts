import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.warn(
      "[db:migrate] DATABASE_URL not set, skipping migrations (OK for CI without DB access).",
    );
    return;
  }
  const sql = neon(url);
  const db = drizzle({ client: sql });
  console.log("[db:migrate] applying pending migrations from db/migrations ...");
  await migrate(db, {
    migrationsFolder: "./db/migrations",
    migrationsSchema: "bodyflow_drizzle",
  });
  console.log("[db:migrate] done.");
}

main().catch((err) => {
  console.error("[db:migrate] failed:", err);
  process.exit(1);
});
