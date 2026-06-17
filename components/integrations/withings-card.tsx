"use client";

import { useState, useTransition } from "react";
import { ClientOnly } from "@/components/client-only";
import { Button } from "@/components/ui/button";
import { CardTitle } from "@/components/ui/card";
import { disconnectWithingsAction, backfillWithingsHistoryAction } from "@/lib/actions/withings";
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
  const [backfillPending, startBackfill] = useTransition();
  const [backfillResult, setBackfillResult] = useState<{ applied: number } | null>(null);

  function handleBackfill() {
    startBackfill(async () => {
      const result = await backfillWithingsHistoryAction();
      if (result.ok) setBackfillResult({ applied: result.applied });
    });
  }

  return (
    <div className={embedded ? "" : "mt-3"}>
      <CardTitle>Withings</CardTitle>

      {connection.connected ? (
        <div className="mt-1 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-[var(--color-primary)]">
              Connected
              {connection.lastSyncAt
                ? ` · ${formatDate(connection.lastSyncAt.toISOString().slice(0, 10))}`
                : ""}
            </p>
            <ClientOnly>
              <form action={disconnectWithingsAction}>
                <Button type="submit" variant="outline" size="sm" className="h-8 px-2.5 text-xs">
                  Disconnect
                </Button>
              </form>
            </ClientOnly>
          </div>
          <ClientOnly>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="w-full h-8 text-xs"
              disabled={backfillPending}
              onClick={handleBackfill}
            >
              {backfillPending ? "Henter historikk…" : "Hent all historikk fra Withings"}
            </Button>
          </ClientOnly>
          {backfillResult && (
            <p className="text-xs text-[var(--color-primary)]">
              Hentet {backfillResult.applied} nye målinger.
            </p>
          )}
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
      {status === "disconnected" ? (
        <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">Withings disconnected.</p>
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
