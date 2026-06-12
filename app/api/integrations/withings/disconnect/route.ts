import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { buildAppUrl } from "@/lib/app-url";
import { requireUserId } from "@/lib/auth/current-user";
import { disconnectWithings } from "@/lib/withings/sync";

export async function POST(request: Request) {
  const userId = await requireUserId();
  await disconnectWithings(userId);
  revalidatePath("/profile");
  revalidatePath("/dashboard");
  return NextResponse.redirect(buildAppUrl(request, "/profile?withings=disconnected"));
}
