import { auth, currentUser } from "@clerk/nextjs/server";
import { ensureUserScope } from "./scope";

export async function getCurrentUserId(): Promise<string | null> {
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
