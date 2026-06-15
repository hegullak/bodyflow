import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth/current-user", () => ({
  requireUserId: vi.fn(),
}));
vi.mock("@/lib/audit/log", () => ({ writeAuditLog: vi.fn() }));

const mockReturning = vi.fn(() => Promise.resolve([{ id: "profile-uuid" }]));
const mockOnConflict = vi.fn(() => ({ returning: mockReturning }));
const mockValues = vi.fn((_data: unknown) => ({ onConflictDoUpdate: mockOnConflict }));
const mockInsert = vi.fn(() => ({ values: mockValues }));
const mockFindFirst = vi.fn();

vi.mock("@/db/client", () => ({
  getDb: vi.fn(() => ({
    insert: mockInsert,
    query: { userProfiles: { findFirst: mockFindFirst } },
  })),
}));

import { requireUserId } from "@/lib/auth/current-user";
import { upsertProfileAction, getProfileForUser } from "@/lib/actions/profile";

function makeFormData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  return fd;
}

const validFields = {
  heightCm: "178",
  activityLevel: "moderate",
  goal: "maintenance",
  preferredUnits: "metric",
};

describe("upsertProfileAction", () => {
  beforeEach(() => {
    vi.mocked(requireUserId).mockResolvedValue("user_test");
    mockReturning.mockResolvedValue([{ id: "profile-uuid" }]);
  });

  afterEach(() => vi.clearAllMocks());

  it("throws when user is not authenticated", async () => {
    vi.mocked(requireUserId).mockRejectedValue(new Error("UNAUTHENTICATED"));
    await expect(upsertProfileAction(null, makeFormData(validFields))).rejects.toThrow("UNAUTHENTICATED");
  });

  it("returns field errors for invalid heightCm", async () => {
    const result = await upsertProfileAction(null, makeFormData({ ...validFields, heightCm: "999" }));
    expect(result.ok).toBe(false);
    expect((result as { ok: false; error: string; fieldErrors?: Record<string, string[]> }).fieldErrors).toBeDefined();
  });

  it("returns error for missing heightCm", async () => {
    const { heightCm: _heightCm, ...rest } = validFields;
    const result = await upsertProfileAction(null, makeFormData(rest));
    expect(result.ok).toBe(false);
  });

  it("calls db.insert and returns ok on valid input", async () => {
    const result = await upsertProfileAction(null, makeFormData(validFields));
    expect(mockInsert).toHaveBeenCalled();
    expect(result.ok).toBe(true);
  });

  it("inserts with the authenticated userId, not a client-supplied one", async () => {
    await upsertProfileAction(null, makeFormData(validFields));
    const insertedValues = mockValues.mock.calls[0]?.[0] as unknown as { userId: string };
    expect(insertedValues.userId).toBe("user_test");
  });
});

describe("getProfileForUser", () => {
  afterEach(() => vi.clearAllMocks());

  it("returns null when no profile exists", async () => {
    mockFindFirst.mockResolvedValue(undefined);
    const result = await getProfileForUser("user_test");
    expect(result).toBeNull();
  });

  it("returns the profile when found", async () => {
    const profile = { id: "profile-uuid", userId: "user_test", heightCm: 178 };
    mockFindFirst.mockResolvedValue(profile);
    const result = await getProfileForUser("user_test");
    expect(result).toEqual(profile);
  });
});
