"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUserId } from "@/lib/auth/current-user";
import { logger } from "@/lib/logger";
import { disconnectWithings } from "@/lib/withings/sync";

export async function disconnectWithingsAction() {
  const userId = await requireUserId();
  await disconnectWithings(userId);
  logger.info("Withings", "Connection disconnected", { userId });
  revalidatePath("/profile");
  revalidatePath("/dashboard");
  redirect("/profile?withings=disconnected");
}
