import { auth } from "@clerk/nextjs/server";
import { ensureUserScope } from "./scope";

export async function getCurrentUserId(): Promise<string | null> {
  const { userId } = await auth();
  return userId;
}

export async function requireUserId(): Promise<string> {
  return ensureUserScope(await getCurrentUserId());
}
