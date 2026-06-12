import { getDb } from "@/db/client";
import { auditLog } from "@/db/schema";

export type AuditAction = "create" | "update" | "delete";

export async function writeAuditLog(input: {
  entityType: string;
  entityId: string;
  action: AuditAction;
  changedBy?: string | null;
  before?: unknown;
  after?: unknown;
}) {
  const db = getDb();
  await db.insert(auditLog).values({
    entityType: input.entityType,
    entityId: input.entityId,
    action: input.action,
    changedBy: input.changedBy ?? null,
    beforeJson: input.before ?? null,
    afterJson: input.after ?? null,
  });
}
