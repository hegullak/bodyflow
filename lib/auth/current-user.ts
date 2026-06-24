import { auth, currentUser } from "@clerk/nextjs/server";
import { ensureUserScope } from "./scope";

export async function getCurrentUserId(): Promise<string | null> {
  // Dev-only auth bypass for local preview/screenshot tooling, which cannot
  // complete Clerk's hosted sign-in inside a sandboxed browser. Hard-gated on
  // a non-production build AND an explicit env var, so it can never be enabled
  // in production. Set PREVIEW_USER_ID in .env.local to your Clerk user id.
  if (process.env.NODE_ENV !== "production" && process.env.PREVIEW_USER_ID) {
    return process.env.PREVIEW_USER_ID;
  }
  const { userId } = await auth();
  return userId;
}

export async function requireUserId(): Promise<string> {
  return ensureUserScope(await getCurrentUserId());
}

export async function getCurrentUserDisplayName(): Promise<string | null> {
  const user = await currentUser();
  if (!user) return null;

  const parts = [user.firstName, user.lastName].filter(
    (part): part is string => Boolean(part?.trim()),
  );
  if (parts.length > 0) return parts.join(" ");

  return user.fullName?.trim() || null;
}
