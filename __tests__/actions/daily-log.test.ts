import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth/current-user", () => ({ requireUserId: vi.fn() }));
vi.mock("@/lib/audit/log", () => ({ writeAuditLog: vi.fn() }));

const mockReturning = vi.fn(() => Promise.resolve([{ id: "log-uuid" }]));
const mockOnConflict = vi.fn((_opts: unknown) => ({ returning: mockReturning }));
const mockValues = vi.fn((_data: unknown) => ({ onConflictDoUpdate: mockOnConflict }));
const mockInsert = vi.fn(() => ({ values: mockValues }));
const mockFindFirst = vi.fn();
const mockFindMany = vi.fn();

vi.mock("@/db/client", () => ({
  getDb: vi.fn(() => ({
    insert: mockInsert,
    query: { dailyBodyLogs: { findFirst: mockFindFirst, findMany: mockFindMany } },
  })),
}));

import { requireUserId } from "@/lib/auth/current-user";
import { upsertDailyLogAction } from "@/lib/actions/daily-log";

function makeFormData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  return fd;
}

describe("upsertDailyLogAction", () => {
  beforeEach(() => {
    vi.mocked(requireUserId).mockResolvedValue("user_test");
    mockReturning.mockResolvedValue([{ id: "log-uuid" }]);
  });

  afterEach(() => vi.clearAllMocks());

  it("throws when user is not authenticated", async () => {
    vi.mocked(requireUserId).mockRejectedValue(new Error("UNAUTHENTICATED"));
    await expect(
      upsertDailyLogAction(null, makeFormData({ logDate: "2026-06-12", weightKg: "75" })),
    ).rejects.toThrow("UNAUTHENTICATED");
  });

  it("returns error when both weight and calories are empty", async () => {
    const result = await upsertDailyLogAction(
      null,
      makeFormData({ logDate: "2026-06-12", weightKg: "", calorieIntake: "" }),
    );
    expect(result.ok).toBe(false);
    expect((result as { ok: false; error: string }).error).toMatch(/weight|calorie/i);
  });

  it("rejects an invalid logDate", async () => {
    const result = await upsertDailyLogAction(
      null,
      makeFormData({ logDate: "not-a-date", weightKg: "75" }),
    );
    expect(result.ok).toBe(false);
  });

  it("succeeds with weight only", async () => {
    const result = await upsertDailyLogAction(
      null,
      makeFormData({ logDate: "2026-06-12", weightKg: "75.5" }),
    );
    expect(result.ok).toBe(true);
    expect(mockInsert).toHaveBeenCalled();
  });

  it("succeeds with calories only", async () => {
    const result = await upsertDailyLogAction(
      null,
      makeFormData({ logDate: "2026-06-12", calorieIntake: "2000" }),
    );
    expect(result.ok).toBe(true);
  });

  it("inserts with the authenticated userId", async () => {
    await upsertDailyLogAction(null, makeFormData({ logDate: "2026-06-12", weightKg: "70" }));
    const inserted = mockValues.mock.calls[0]?.[0] as unknown as { userId: string };
    expect(inserted.userId).toBe("user_test");
  });

  it("sets weightSource to manual when weight is provided", async () => {
    await upsertDailyLogAction(null, makeFormData({ logDate: "2026-06-12", weightKg: "70" }));
    const inserted = mockValues.mock.calls[0]?.[0] as unknown as { weightSource: string };
    expect(inserted.weightSource).toBe("manual");
  });

  it("does not overwrite weightSource when only calories are provided", async () => {
    await upsertDailyLogAction(null, makeFormData({ logDate: "2026-06-12", calorieIntake: "1800" }));
    const conflictSet = (mockOnConflict.mock.calls[0]?.[0] as unknown as { set: Record<string, unknown> }).set;
    expect(conflictSet.weightKg).toBeUndefined();
    expect(conflictSet.weightSource).toBeUndefined();
  });
});
