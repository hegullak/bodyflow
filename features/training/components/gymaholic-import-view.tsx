"use client";

import { useTransition, useState } from "react";
import { ChevronDown, Upload } from "lucide-react";
import { dryRunGymaholicImport, executeGymaholicImport } from "../actions/import-gymaholic";
import type { DryRunReport } from "@/lib/gymaholic/dry-run";
import { cn } from "@/lib/utils";

type Step = "idle" | "validating" | "validated" | "importing" | "complete" | "error";

export function GymaholicImportView() {
  const [step, setStep] = useState<Step>("idle");
  const [csvText, setCsvText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [report, setReport] = useState<DryRunReport | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [results, setResults] = useState<{ sessions: number; sets: number } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [expandUnmatched, setExpandUnmatched] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setErrorMsg(null);
    setStep("idle");

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      setCsvText(text);
    };
    reader.onerror = () => {
      setErrorMsg("Failed to read file");
    };
  };

  const handleValidate = () => {
    if (!csvText) {
      setErrorMsg("No file selected");
      return;
    }

    setStep("validating");
    setErrorMsg(null);

    startTransition(async () => {
      const result = await dryRunGymaholicImport(csvText);

      if (!result.ok) {
        setStep("error");
        setErrorMsg(result.error);
        return;
      }

      setReport(result.report);
      setStep("validated");
    });
  };

  const handleImport = () => {
    if (!report) {
      setErrorMsg("No validation report");
      return;
    }

    setStep("importing");
    setErrorMsg(null);

    startTransition(async () => {
      const result = await executeGymaholicImport(csvText);

      if (!result.ok) {
        setStep("error");
        setErrorMsg(result.error);
        return;
      }

      setResults({
        sessions: result.sessionsCreated,
        sets: result.setsCreated,
      });
      setStep("complete");
    });
  };

  return (
    <div className="space-y-4">
      <div className="rounded-[var(--radius-lg)] border border-[var(--card-border)] bg-[var(--card)] p-4">
        <h2 className="mb-3 text-sm font-semibold text-[var(--text1)]">
          Gymaholic Workout Import
        </h2>

        {/* File input */}
        <div className="mb-4">
          <label className="block">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              disabled={isPending}
              className="hidden"
            />
            <div className="flex cursor-pointer items-center justify-center rounded-[var(--radius-md)] border-2 border-dashed border-[var(--text3)] bg-[var(--card2)] px-4 py-6 transition-colors hover:border-[var(--accent)]">
              <div className="text-center">
                <Upload className="mx-auto mb-2 h-6 w-6 text-[var(--text3)]" />
                <p className="text-sm font-medium text-[var(--text1)]">
                  {fileName ? fileName : "Choose CSV file or drag here"}
                </p>
                <p className="text-xs text-[var(--text3)]">Gymaholic export format</p>
              </div>
            </div>
          </label>
        </div>

        {/* Validate button */}
        {step === "idle" && (
          <button
            onClick={handleValidate}
            disabled={!csvText || isPending}
            className={cn(
              "w-full rounded-[var(--radius-md)] px-4 py-2 text-sm font-medium transition-colors",
              csvText && !isPending
                ? "bg-[var(--accent)] text-white hover:opacity-90"
                : "bg-[var(--card2)] text-[var(--text3)]",
            )}
          >
            {isPending ? "Validating..." : "Validate CSV"}
          </button>
        )}

        {/* Error message */}
        {errorMsg && (
          <div className="mt-3 rounded-[var(--radius-md)] border border-[#9a5b45]/30 bg-[#f8ece6] px-3 py-2 text-xs text-[#9a5b45]">
            {errorMsg}
          </div>
        )}
      </div>

      {/* Validation report */}
      {report && step === "validated" && (
        <div className="space-y-3 rounded-[var(--radius-lg)] border border-[var(--card-border)] bg-[var(--card)] p-4">
          <h3 className="text-sm font-semibold text-[var(--text1)]">Import Preview</h3>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded bg-[var(--card2)] px-2 py-1.5">
              <p className="text-[var(--text3)]">Rows</p>
              <p className="font-semibold text-[var(--text1)]">{report.totalRows}</p>
            </div>
            <div className="rounded bg-[var(--card2)] px-2 py-1.5">
              <p className="text-[var(--text3)]">Sessions</p>
              <p className="font-semibold text-[var(--text1)]">{report.totalSessions}</p>
            </div>
            <div className="rounded bg-[var(--card2)] px-2 py-1.5">
              <p className="text-[var(--text3)]">Exercises</p>
              <p className="font-semibold text-[var(--text1)]">
                {report.totalExerciseInstances}
              </p>
            </div>
            <div className="rounded bg-[var(--card2)] px-2 py-1.5">
              <p className="text-[var(--text3)]">Sets</p>
              <p className="font-semibold text-[var(--text1)]">{report.totalSets}</p>
            </div>
          </div>

          {/* Matched exercises */}
          {report.exerciseMatches.length > 0 && (
            <div className="text-xs">
              <p className="mb-1 font-medium text-[var(--text2)]">
                ✓ {report.exerciseMatches.length} matched exercise
                {report.exerciseMatches.length !== 1 ? "s" : ""}
              </p>
              <ul className="space-y-0.5 text-[var(--text3)]">
                {report.exerciseMatches.slice(0, 3).map((m) => (
                  <li key={m.exerciseKey}>
                    • {m.exerciseName} ({m.matchType})
                  </li>
                ))}
                {report.exerciseMatches.length > 3 && (
                  <li className="text-[var(--text3)]">
                    ... and {report.exerciseMatches.length - 3} more
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* Unmatched exercises */}
          {report.unmatchedExercises.length > 0 && (
            <div className="text-xs">
              <button
                onClick={() => setExpandUnmatched(!expandUnmatched)}
                className="mb-1 flex items-center gap-1 font-medium text-[#E0976A]"
              >
                <ChevronDown
                  className={cn(
                    "h-3 w-3 transition-transform",
                    expandUnmatched && "rotate-180",
                  )}
                />
                ⚠ {report.unmatchedExercises.length} exercise
                {report.unmatchedExercises.length !== 1 ? "s" : ""} will be created
              </button>
              {expandUnmatched && (
                <ul className="space-y-0.5 pl-4 text-[var(--text3)]">
                  {report.unmatchedExercises.map((m) => (
                    <li key={m.exerciseKey}>• {m.exerciseName}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Errors */}
          {report.invalidRows > 0 && (
            <div className="text-xs text-[#9a5b45]">
              ⚠ {report.invalidRows} invalid row
              {report.invalidRows !== 1 ? "s" : ""}
            </div>
          )}

          {/* Import button */}
          <button
            onClick={handleImport}
            disabled={isPending}
            className="w-full rounded-[var(--radius-md)] bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-60"
          >
            {isPending ? "Importing..." : "Import Now"}
          </button>
        </div>
      )}

      {/* Import complete */}
      {results && step === "complete" && (
        <div className="space-y-2 rounded-[var(--radius-lg)] border border-[#4FA88A]/30 bg-[#E8F5F1] px-4 py-3">
          <h3 className="text-sm font-semibold text-[#2d6e5c]">Import Complete ✓</h3>
          <div className="text-xs text-[#2d6e5c]">
            <p>Created {results.sessions} workout sessions</p>
            <p>Logged {results.sets} sets</p>
          </div>
          <button
            onClick={() => {
              setStep("idle");
              setCsvText("");
              setFileName(null);
              setReport(null);
              setResults(null);
            }}
            className="mt-2 text-xs font-medium text-[#2d6e5c] hover:underline"
          >
            Import another file
          </button>
        </div>
      )}
    </div>
  );
}
