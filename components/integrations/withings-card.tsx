import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHint, CardTitle } from "@/components/ui/card";
import type { WithingsConnection } from "@/db/schema";
import { isWithingsConfigured } from "@/lib/withings/config";
import { formatDate } from "@/lib/utils";

export function WithingsCard({
  connection,
  status,
}: {
  connection: WithingsConnection | null;
  status?: string | null;
}) {
  const configured = isWithingsConfigured();

  return (
    <Card className="mt-4">
      <CardTitle>Withings scale</CardTitle>
      <CardHint className="mt-2">
        Sync weight automatically in the background. Manual entries always take priority.
      </CardHint>

      {!configured ? (
        <p className="mt-3 text-sm text-[var(--color-muted-foreground)]">
          Add <code className="text-xs">WITHINGS_CLIENT_ID</code> and{" "}
          <code className="text-xs">WITHINGS_CLIENT_SECRET</code> to <code className="text-xs">.env.local</code>{" "}
          to enable sync.
        </p>
      ) : connection ? (
        <div className="mt-3 space-y-3">
          <p className="text-sm text-[var(--color-primary)]">Connected</p>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Last sync:{" "}
            {connection.lastSyncAt ? formatDate(connection.lastSyncAt.toISOString().slice(0, 10)) : "Not yet"}
          </p>
          <form action="/api/integrations/withings/disconnect" method="post">
            <Button type="submit" variant="outline" size="sm">
              Disconnect
            </Button>
          </form>
        </div>
      ) : (
        <div className="mt-3">
          <Link
            href="/api/integrations/withings/connect"
            className="inline-flex h-10 items-center rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 text-sm font-medium text-[var(--color-primary-foreground)]"
          >
            Connect Withings
          </Link>
        </div>
      )}

      {status === "connected" ? (
        <p className="mt-3 text-sm text-[var(--color-primary)]">Withings connected. Syncing weight…</p>
      ) : null}
      {status === "denied" ? (
        <p className="mt-3 text-sm text-[#9a5b45]">Withings connection was cancelled.</p>
      ) : null}
      {status === "error" || status === "invalid" || status === "invalid_state" ? (
        <p className="mt-3 text-sm text-[#9a5b45]">Could not connect Withings. Try again.</p>
      ) : null}
    </Card>
  );
}
