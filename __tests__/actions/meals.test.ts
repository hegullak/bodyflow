import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth/current-user", () => ({ requireUserId: vi.fn() }));
vi.mock("@/lib/audit/log", () => ({ writeAuditLog: vi.fn() }));
vi.mock("@/lib/foods/catalog", () => ({ resolveFoodProduct: vi.fn() }));
vi.mock("@/lib/kassal/client", () => ({ buildMealCalories: vi.fn(() => 250) }));

const mockInsertReturning = vi.fn(() => Promise.resolve([{ id: "item-uuid" }]));
const mockInsertValues = vi.fn(() => ({
  returning: mockInsertReturning,
  onConflictDoUpdate: vi.fn(() => Promise.resolve([])),
}));
const mockInsert = vi.fn(() => ({ values: mockInsertValues }));

const mockUpdateReturning = vi.fn(() => Promise.resolve([{ id: "item-uuid" }]));
const mockUpdateWhere = vi.fn(() => ({ returning: mockUpdateReturning }));
const mockUpdateSet = vi.fn((_data: unknown) => ({ where: mockUpdateWhere }));
const mockUpdate = vi.fn(() => ({ set: mockUpdateSet }));

const mockSelectWhere = vi.fn(() => Promise.resolve([{ total: 500 }]));
const mockSelectFrom = vi.fn(() => ({ where: mockSelectWhere }));
const mockSelect = vi.fn(() => ({ from: mockSelectFrom }));

vi.mock("@/db/client", () => ({
  getDb: vi.fn(() => ({
    insert: mockInsert,
    update: mockUpdate,
    select: mockSelect,
    query: {
      mealLogItems: { findMany: vi.fn(() => Promise.resolve([])) },
    },
  })),
}));

import { requireUserId } from "@/lib/auth/current-user";
import { resolveFoodProduct } from "@/lib/foods/catalog";
import { addMealItemAction, removeMealItemAction } from "@/lib/actions/meals";

function makeFormData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  return fd;
}

const validMealFields = {
  logDate: "2026-06-12",
  mealType: "breakfast",
  foodProductId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  quantityGrams: "150",
};

const mockFood = {
  id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  source: "custom" as const,
  externalId: "custom-1",
  name: "Test Food",
  brand: null,
  ean: null,
  kcalPer100g: 250,
};

describe("addMealItemAction", () => {
  beforeEach(() => {
    vi.mocked(requireUserId).mockResolvedValue("user_test");
    vi.mocked(resolveFoodProduct).mockResolvedValue(mockFood as never);
    mockInsertReturning.mockResolvedValue([{ id: "item-uuid" }]);
  });

  afterEach(() => vi.clearAllMocks());

  it("throws when user is not authenticated", async () => {
    vi.mocked(requireUserId).mockRejectedValue(new Error("UNAUTHENTICATED"));
    await expect(addMealItemAction(null, makeFormData(validMealFields))).rejects.toThrow("UNAUTHENTICATED");
  });

  it("returns field error for invalid mealType", async () => {
    const result = await addMealItemAction(null, makeFormData({ ...validMealFields, mealType: "brunch" }));
    expect(result.ok).toBe(false);
  });

  it("returns error when no product reference is given", async () => {
    const result = await addMealItemAction(
      null,
      makeFormData({ ...validMealFields, foodProductId: "" }),
    );
    expect(result.ok).toBe(false);
  });

  it("returns error for invalid logDate", async () => {
    const result = await addMealItemAction(null, makeFormData({ ...validMealFields, logDate: "bad-date" }));
    expect(result.ok).toBe(false);
  });

  it("does not leak internal error details to the client", async () => {
    vi.mocked(resolveFoodProduct).mockRejectedValue(
      new Error("DB connection string is postgresql://user:secret@host/db"),
    );
    const result = await addMealItemAction(null, makeFormData(validMealFields));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).not.toMatch(/postgresql|secret/i);
  });

  it("calls db.insert and returns ok on valid input", async () => {
    const result = await addMealItemAction(null, makeFormData(validMealFields));
    expect(mockInsert).toHaveBeenCalled();
    expect(result.ok).toBe(true);
  });
});

describe("removeMealItemAction", () => {
  beforeEach(() => {
    vi.mocked(requireUserId).mockResolvedValue("user_test");
    mockUpdateReturning.mockResolvedValue([{ id: "item-uuid" }]);
  });

  afterEach(() => vi.clearAllMocks());

  it("throws when user is not authenticated", async () => {
    vi.mocked(requireUserId).mockRejectedValue(new Error("UNAUTHENTICATED"));
    await expect(removeMealItemAction("item-uuid", "2026-06-12")).rejects.toThrow("UNAUTHENTICATED");
  });

  it("returns error when item is not found (already deleted or wrong user)", async () => {
    mockUpdateReturning.mockResolvedValue([]);
    const result = await removeMealItemAction("item-uuid", "2026-06-12");
    expect(result.ok).toBe(false);
    expect((result as { ok: false; error: string }).error).toMatch(/not found/i);
  });

  it("soft-deletes the item (calls update, not hard delete)", async () => {
    await removeMealItemAction("item-uuid", "2026-06-12");
    expect(mockUpdate).toHaveBeenCalled();
    const setArg = mockUpdateSet.mock.calls[0]?.[0] as unknown as { deletedAt: Date };
    expect(setArg.deletedAt).toBeInstanceOf(Date);
  });

  it("returns ok when item is found and soft-deleted", async () => {
    const result = await removeMealItemAction("item-uuid", "2026-06-12");
    expect(result.ok).toBe(true);
  });
});
