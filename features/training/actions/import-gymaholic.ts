"use server";

import { requireUserId } from "@/lib/auth/current-user";
import { parseGymaholicCsv } from "@/lib/gymaholic/parser";
import { generateDryRun } from "@/lib/gymaholic/dry-run";
import { importGymaholicSets } from "@/lib/gymaholic/importer";
import { logger } from "@/lib/logger";
import type { DryRunReport } from "@/lib/gymaholic/dry-run";

export interface ImportDryRunResult {
  ok: true;
  report: DryRunReport;
}

export interface ImportExecuteResult {
  ok: true;
  sessionsCreated: number;
  sessionsSkipped: number;
  setsCreated: number;
  setsSkipped: number;
}

export interface ImportError {
  ok: false;
  error: string;
}

/**
 * Parse and validate a Gymaholic CSV file. Returns a dry-run report showing
 * what would be imported without making any database changes.
 */
export async function dryRunGymaholicImport(
  csvText: string,
): Promise<ImportDryRunResult | ImportError> {
  try {
    const userId = await requireUserId();

    const { rows, errors } = parseGymaholicCsv(csvText);

    if (errors.length > 0 && rows.length === 0) {
      return {
        ok: false,
        error: `CSV validation failed: ${errors.map((e) => e.reason).join("; ")}`,
      };
    }

    const report = await generateDryRun(rows, errors);

    return { ok: true, report };
  } catch (err) {
    logger.error("ImportGymaholic", "Dry-run failed", { err: String(err) });
    return { ok: false, error: `Dry-run failed: ${String(err)}` };
  }
}

/**
 * Execute the Gymaholic CSV import. Must call dryRunGymaholicImport first
 * to validate the CSV. This action performs the actual import.
 */
export async function executeGymaholicImport(
  csvText: string,
): Promise<ImportExecuteResult | ImportError> {
  try {
    const userId = await requireUserId();

    const { rows, errors } = parseGymaholicCsv(csvText);

    if (errors.length > 0 && rows.length === 0) {
      return {
        ok: false,
        error: `CSV validation failed: ${errors.map((e) => e.reason).join("; ")}`,
      };
    }

    const stats = await importGymaholicSets(userId, rows);

    logger.info("ImportGymaholic", "Import complete", {
      sessionsCreated: stats.sessionsCreated,
      setsCreated: stats.setsCreated,
    });

    return {
      ok: true,
      sessionsCreated: stats.sessionsCreated,
      sessionsSkipped: stats.sessionsSkipped,
      setsCreated: stats.setsCreated,
      setsSkipped: stats.setsSkipped,
    };
  } catch (err) {
    logger.error("ImportGymaholic", "Import failed", { err: String(err) });
    return { ok: false, error: `Import failed: ${String(err)}` };
  }
}
