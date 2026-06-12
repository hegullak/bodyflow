import type { SQL } from "drizzle-orm";
import { and, eq } from "drizzle-orm";

export function scopeBy(
  userIdColumn: { name: string },
  userId: string,
  ...rest: (SQL | undefined)[]
): SQL {
  if (!userId || typeof userId !== "string") {
    throw new Error("[scopeBy] refusing to build a query without a user id");
  }
  const eqUser = eq(userIdColumn as unknown as { name: string } & SQL, userId) as SQL;
  const filters = [eqUser, ...rest].filter((x): x is SQL => Boolean(x));
  const combined = and(...filters);
  if (!combined) {
    throw new Error("[scopeBy] no filters produced");
  }
  return combined;
}

export function ensureUserScope(userId: string | null | undefined): string {
  if (!userId) {
    const err = new Error("UNAUTHENTICATED");
    (err as Error & { code: string }).code = "UNAUTHENTICATED";
    throw err;
  }
  return userId;
}
