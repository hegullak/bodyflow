import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { count } from "drizzle-orm";
import * as schema from "../db/schema";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL not set");
    process.exit(1);
  }

  const sql = neon(url);
  const db = drizzle({ client: sql, schema, casing: "snake_case" });

  const [exerciseCount] = await db
    .select({ count: count() })
    .from(schema.exercises);

  const [categoryCount] = await db
    .select({ count: count() })
    .from(schema.exerciseCategories);

  const [muscleCount] = await db
    .select({ count: count() })
    .from(schema.exerciseMuscles);

  const [secondaryCount] = await db
    .select({ count: count() })
    .from(schema.exerciseSecondaryMuscles);

  console.log(`
📊 Exercise Catalog Stats:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Exercises:           ${exerciseCount.count}
  Categories:          ${categoryCount.count}
  Muscles:             ${muscleCount.count}
  Secondary Muscles:   ${secondaryCount.count}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Target:              1500 exercises
  Progress:            ${Math.round((exerciseCount.count / 1500) * 100)}%
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `);
}

main().catch(console.error);
