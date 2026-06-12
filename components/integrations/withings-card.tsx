"use client";

import { ClientOnly } from "@/components/client-only";
import { Button } from "@/components/ui/button";
import { CardTitle } from "@/components/ui/card";
import type { WithingsConnectionPublic } from "@/lib/withings/types";
import { formatDate } from "@/lib/utils";

export function WithingsCard({
  connection,
  configured,
  status,
  embedded = false,
}: {
  connection: WithingsConnectionPublic;
  configured: boolean;
  status?: string | null;
  embedded?: boolean;
}) {
  return (
    <div className={embedded ? "" : "mt-3"}>
      <CardTitle>Withings</CardTitle>

      {connection.connected ? (
        <div className="mt-1 flex items-center justify-between gap-2">
          <p className="text-xs text-[var(--color-primary)]">
            Connected
            {connection.lastSyncAt
              ? ` · ${formatDate(connection.lastSyncAt.toISOString().slice(0, 10))}`
              : ""}
          </p>
          <ClientOnly>
            <form action="/api/integrations/withings/disconnect" method="post">
              <Button type="submit" variant="outline" size="sm" className="h-8 px-2.5 text-xs">
                Disconnect
              </Button>
            </form>
          </ClientOnly>
        </div>
      ) : !configured ? (
        <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
          Withings is not configured on the server.
        </p>
      ) : (
        <a
          href="/api/integrations/withings/connect"
          className="mt-1.5 inline-flex h-8 items-center rounded-[var(--radius-md)] bg-[var(--color-primary)] px-3 text-xs font-medium text-[var(--color-primary-foreground)]"
        >
          Connect Withings
        </a>
      )}

      {status === "connected" ? (
        <p className="mt-1 text-xs text-[var(--color-primary)]">Withings connected.</p>
      ) : null}
      {status === "denied" ? (
        <p className="mt-1 text-xs text-[#9a5b45]">Connection cancelled.</p>
      ) : null}
      {status === "error" || status === "invalid" || status === "invalid_state" ? (
        <p className="mt-1 text-xs text-[#9a5b45]">Could not connect. Try again.</p>
      ) : null}
    </div>
  );
}
