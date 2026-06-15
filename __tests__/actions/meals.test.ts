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

const mockFindMany = vi.fn(() => Promise.resolve([]));

vi.mock("@/db/client", () => ({
  getDb: vi.fn(() => ({
    insert: mockInsert,
    update: mockUpdate,
    select: mockSelect,
    query: {
      mealLogItems: { findMany: mockFindMany },
    },
  })),
}));

import { requireUserId } from "@/lib/auth/current-user";
import { resolveFoodProduct } from "@/lib/foods/catalog";
import {
  addMealItemAction,
  copyMealsFromPreviousDateAction,
  getRecentMealItemsAction,
  quickAddMealItemAction,
  reAddMealItemAction,
  removeMealItemAction,
  type RecentMealItem,
} from "@/lib/actions/meals";

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

const mockMealRow = {
  id: "row-uuid",
  userId: "user_test",
  logDate: "2026-06-10",
  mealType: "breakfast" as const,
  productName: "Test Food",
  brand: null,
  foodProductId: null,
  kassalProductId: null,
  ean: null,
  quantityGrams: 100,
  kcalPer100g: 200,
  caloriesKcal: 200,
  createdAt: new Date("2026-06-10T08:00:00Z"),
  updatedAt: new Date(),
  deletedAt: null,
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

describe("quickAddMealItemAction", () => {
  beforeEach(() => {
    vi.mocked(requireUserId).mockResolvedValue("user_test");
    mockInsertReturning.mockResolvedValue([{ id: "quick-uuid" }]);
  });

  afterEach(() => vi.clearAllMocks());

  it("throws when user is not authenticated", async () => {
    vi.mocked(requireUserId).mockRejectedValue(new Error("UNAUTHENTICATED"));
    await expect(quickAddMealItemAction("2026-06-12", "lunch", "Egg", 150)).rejects.toThrow("UNAUTHENTICATED");
  });

  it("returns error when caloriesKcal is zero", async () => {
    const result = await quickAddMealItemAction("2026-06-12", "lunch", "Egg", 0);
    expect(result.ok).toBe(false);
  });

  it("returns error when caloriesKcal is negative", async () => {
    const result = await quickAddMealItemAction("2026-06-12", "lunch", "Egg", -10);
    expect(result.ok).toBe(false);
  });

  it("inserts with default name when name is blank", async () => {
    await quickAddMealItemAction("2026-06-12", "lunch", "  ", 300);
    const insertedValues = mockInsertValues.mock.calls[0]?.[0] as { productName: string };
    expect(insertedValues.productName).toBe("Egendefinert");
  });

  it("calls db.insert and returns ok on valid input", async () => {
    const result = await quickAddMealItemAction("2026-06-12", "lunch", "Egg", 150);
    expect(mockInsert).toHaveBeenCalled();
    expect(result.ok).toBe(true);
  });

  it("returns error on DB failure without leaking internals", async () => {
    mockInsertReturning.mockRejectedValue(new Error("pg connection failed: secret-host"));
    const result = await quickAddMealItemAction("2026-06-12", "lunch", "Egg", 150);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).not.toMatch(/secret-host/i);
  });
});

describe("getRecentMealItemsAction", () => {
  beforeEach(() => {
    vi.mocked(requireUserId).mockResolvedValue("user_test");
  });

  afterEach(() => vi.clearAllMocks());

  it("throws when user is not authenticated", async () => {
    vi.mocked(requireUserId).mockRejectedValue(new Error("UNAUTHENTICATED"));
    await expect(getRecentMealItemsAction()).rejects.toThrow("UNAUTHENTICATED");
  });

  it("returns empty array when no items exist", async () => {
    mockFindMany.mockResolvedValue([]);
    const result = await getRecentMealItemsAction();
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toHaveLength(0);
  });

  it("de-duplicates by productName, keeping only the most recent", async () => {
    mockFindMany.mockResolvedValue([
      { ...mockMealRow, productName: "Havregryn", createdAt: new Date("2026-06-12") },
      { ...mockMealRow, productName: "Havregryn", createdAt: new Date("2026-06-10") },
      { ...mockMealRow, productName: "Egg", createdAt: new Date("2026-06-11") },
    ]);
    const result = await getRecentMealItemsAction();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toHaveLength(2);
      expect(result.data.map((r) => r.productName)).toEqual(["Havregryn", "Egg"]);
    }
  });

  it("returns at most 15 unique items even if DB returns more", async () => {
    const rows = Array.from({ length: 20 }, (_, i) => ({
      ...mockMealRow,
      productName: `Food ${i}`,
    }));
    mockFindMany.mockResolvedValue(rows);
    const result = await getRecentMealItemsAction();
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toHaveLength(15);
  });

  it("returns error on DB failure without leaking internals", async () => {
    mockFindMany.mockRejectedValue(new Error("DB connection failed: secret"));
    const result = await getRecentMealItemsAction();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).not.toMatch(/secret/i);
  });
});

describe("reAddMealItemAction", () => {
  const recentItem: RecentMealItem = {
    productName: "Havregryn",
    brand: "AXA",
    caloriesKcal: 350,
    quantityGrams: 100,
    kcalPer100g: 350,
    foodProductId: null,
    kassalProductId: null,
    ean: null,
  };

  beforeEach(() => {
    vi.mocked(requireUserId).mockResolvedValue("user_test");
    mockInsertReturning.mockResolvedValue([{ id: "re-add-uuid" }]);
  });

  afterEach(() => vi.clearAllMocks());

  it("throws when user is not authenticated", async () => {
    vi.mocked(requireUserId).mockRejectedValue(new Error("UNAUTHENTICATED"));
    await expect(reAddMealItemAction("2026-06-12", "breakfast", recentItem)).rejects.toThrow("UNAUTHENTICATED");
  });

  it("calls db.insert with item data and returns ok", async () => {
    const result = await reAddMealItemAction("2026-06-12", "breakfast", recentItem);
    expect(mockInsert).toHaveBeenCalled();
    const insertedValues = mockInsertValues.mock.calls[0]?.[0] as { productName: string; caloriesKcal: number };
    expect(insertedValues.productName).toBe("Havregryn");
    expect(insertedValues.caloriesKcal).toBe(350);
    expect(result.ok).toBe(true);
  });

  it("returns error on DB failure without leaking internals", async () => {
    mockInsertReturning.mockRejectedValue(new Error("pg secret connection error"));
    const result = await reAddMealItemAction("2026-06-12", "breakfast", recentItem);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).not.toMatch(/secret/i);
  });
});

describe("copyMealsFromPreviousDateAction", () => {
  const validCopyFields = {
    logDate: "2026-06-12",
    mealType: "breakfast",
    sourceDate: "2026-06-11",
  };

  beforeEach(() => {
    vi.mocked(requireUserId).mockResolvedValue("user_test");
    mockInsertReturning.mockResolvedValue([{ id: "copy-uuid" }]);
    mockFindMany.mockResolvedValue([mockMealRow]);
  });

  afterEach(() => vi.clearAllMocks());

  it("throws when user is not authenticated", async () => {
    vi.mocked(requireUserId).mockRejectedValue(new Error("UNAUTHENTICATED"));
    await expect(copyMealsFromPreviousDateAction(null, makeFormData(validCopyFields))).rejects.toThrow("UNAUTHENTICATED");
  });

  it("returns error when required fields are missing", async () => {
    const result = await copyMealsFromPreviousDateAction(null, makeFormData({ logDate: "2026-06-12" }));
    expect(result.ok).toBe(false);
    expect((result as { ok: false; error: string }).error).toMatch(/missing/i);
  });

  it("returns error when no source items exist for that date/type", async () => {
    mockFindMany.mockResolvedValue([]);
    const result = await copyMealsFromPreviousDateAction(null, makeFormData(validCopyFields));
    expect(result.ok).toBe(false);
    expect((result as { ok: false; error: string }).error).toMatch(/no meals found/i);
  });

  it("copies items from source date and returns ok", async () => {
    const result = await copyMealsFromPreviousDateAction(null, makeFormData(validCopyFields));
    expect(mockInsert).toHaveBeenCalled();
    expect(result.ok).toBe(true);
  });

  it("returns error on DB failure without leaking internals", async () => {
    mockFindMany.mockRejectedValue(new Error("pg secret error"));
    const result = await copyMealsFromPreviousDateAction(null, makeFormData(validCopyFields));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).not.toMatch(/secret/i);
  });
});
