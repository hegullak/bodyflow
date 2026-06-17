import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth/current-user", () => ({ requireUserId: vi.fn() }));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function chain(v: unknown[] = []): any {
  const p = Promise.resolve(v);
  return Object.assign(p, { orderBy: () => chain(v), limit: () => chain(v) });
}

const mockInsertValues = vi.fn<() => { returning: typeof mockInsertReturning }>(() => ({ returning: mockInsertReturning }));
const mockInsertReturning = vi.fn<() => Promise<unknown[]>>(() => Promise.resolve([{ id: "meal-uuid" }]));
const mockInsert = vi.fn(() => ({ values: mockInsertValues }));

const mockUpdateWhere = vi.fn<() => Promise<unknown[]>>(() => Promise.resolve([]));
const mockUpdateSet = vi.fn<() => { where: typeof mockUpdateWhere }>(() => ({ where: mockUpdateWhere }));
const mockUpdate = vi.fn(() => ({ set: mockUpdateSet }));

const mockSelectWhere = vi.fn(() => chain([]));
const mockSelectFrom = vi.fn(() => ({ where: mockSelectWhere }));
const mockSelect = vi.fn(() => ({ from: mockSelectFrom }));

vi.mock("@/db/client", () => ({
  getDb: vi.fn(() => ({
    insert: mockInsert,
    update: mockUpdate,
    select: mockSelect,
  })),
}));

import { requireUserId } from "@/lib/auth/current-user";
import {
  addSavedMealToLogAction,
  deleteSavedMealAction,
  getSavedMealsAction,
  saveMealAction,
} from "@/lib/actions/saved-meals";

const mockMealItem = {
  id: "item-uuid",
  userId: "user_test",
  logDate: "2026-06-12",
  mealType: "breakfast" as const,
  productName: "Havregryn",
  brand: "AXA",
  foodProductId: null,
  kassalProductId: null,
  ean: null,
  quantityGrams: 100,
  kcalPer100g: 350,
  caloriesKcal: 350,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

describe("saveMealAction", () => {
  beforeEach(() => {
    vi.mocked(requireUserId).mockResolvedValue("user_test");
    mockInsertReturning.mockResolvedValue([{ id: "saved-meal-uuid" }]);
    mockSelectWhere.mockReturnValue(chain([mockMealItem]));
  });

  afterEach(() => vi.clearAllMocks());

  it("throws when user is not authenticated", async () => {
    vi.mocked(requireUserId).mockRejectedValue(new Error("UNAUTHENTICATED"));
    await expect(saveMealAction("2026-06-12", "breakfast", "Frokost")).rejects.toThrow("UNAUTHENTICATED");
  });

  it("returns error when name is empty", async () => {
    const result = await saveMealAction("2026-06-12", "breakfast", "  ");
    expect(result.ok).toBe(false);
    expect((result as { ok: false; error: string }).error).toMatch(/tomt/i);
  });

  it("returns error when no meal items exist for that date/type", async () => {
    mockSelectWhere.mockReturnValue(chain([]));
    const result = await saveMealAction("2026-06-12", "breakfast", "Frokost");
    expect(result.ok).toBe(false);
    expect((result as { ok: false; error: string }).error).toMatch(/ingen/i);
  });

  it("creates saved meal and saved meal items", async () => {
    const result = await saveMealAction("2026-06-12", "breakfast", "Frokost");
    expect(mockInsert).toHaveBeenCalledTimes(2);
    expect(result.ok).toBe(true);
  });

  it("trims whitespace from the name", async () => {
    await saveMealAction("2026-06-12", "breakfast", "  Min Frokost  ");
    const insertArg = (mockInsertValues.mock.calls as unknown[][])[0]?.[0] as { name: string };
    expect(insertArg.name).toBe("Min Frokost");
  });

  it("returns error on DB failure without leaking internals", async () => {
    mockInsertReturning.mockRejectedValue(new Error("pg secret connection error"));
    const result = await saveMealAction("2026-06-12", "breakfast", "Frokost");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).not.toMatch(/secret/i);
  });
});

describe("getSavedMealsAction", () => {
  beforeEach(() => {
    vi.mocked(requireUserId).mockResolvedValue("user_test");
    mockSelectWhere.mockReturnValue(chain([]));
  });

  afterEach(() => vi.clearAllMocks());

  it("throws when user is not authenticated", async () => {
    vi.mocked(requireUserId).mockRejectedValue(new Error("UNAUTHENTICATED"));
    await expect(getSavedMealsAction()).rejects.toThrow("UNAUTHENTICATED");
  });

  it("returns empty array when no saved meals exist", async () => {
    const result = await getSavedMealsAction();
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toHaveLength(0);
  });

  it("returns meals with rounded kcal and grams", async () => {
    mockSelectWhere.mockReturnValue(chain([
      { id: "m1", name: "Frokost", totalKcal: 349.7, totalGrams: 100.3, createdAt: new Date(), deletedAt: null },
    ]));
    const result = await getSavedMealsAction();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data[0].totalKcal).toBe(350);
      expect(result.data[0].totalGrams).toBe(100);
    }
  });

  it("returns error on DB failure without leaking internals", async () => {
    mockSelectWhere.mockReturnValue(Promise.reject(new Error("pg secret error")));
    const result = await getSavedMealsAction();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).not.toMatch(/secret/i);
  });
});

describe("addSavedMealToLogAction", () => {
  const savedMeal = {
    id: "saved-meal-uuid",
    userId: "user_test",
    name: "Frokost",
    totalKcal: 350,
    totalGrams: 100,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const savedMealItems = [
    {
      id: "item-uuid",
      savedMealId: "saved-meal-uuid",
      foodProductId: null,
      productName: "Havregryn",
      brand: "AXA",
      quantityGrams: 100,
      kcalPer100g: 350,
      caloriesKcal: 350,
    },
  ];

  beforeEach(() => {
    vi.mocked(requireUserId).mockResolvedValue("user_test");
    // First select returns the saved meal, second select returns its items
    mockSelectWhere
      .mockReturnValueOnce(chain([savedMeal]))
      .mockReturnValueOnce(chain(savedMealItems));
    mockInsertValues.mockReturnValue({ returning: vi.fn(() => Promise.resolve([])) });
  });

  afterEach(() => vi.clearAllMocks());

  it("throws when user is not authenticated", async () => {
    vi.mocked(requireUserId).mockRejectedValue(new Error("UNAUTHENTICATED"));
    await expect(addSavedMealToLogAction("saved-meal-uuid", "2026-06-12", "breakfast")).rejects.toThrow("UNAUTHENTICATED");
  });

  it("returns error when saved meal is not found", async () => {
    mockSelectWhere.mockReset().mockReturnValue(chain([]));
    const result = await addSavedMealToLogAction("saved-meal-uuid", "2026-06-12", "breakfast");
    expect(result.ok).toBe(false);
    expect((result as { ok: false; error: string }).error).toMatch(/ikke funnet/i);
  });

  it("inserts meal items into log and returns ok", async () => {
    const result = await addSavedMealToLogAction("saved-meal-uuid", "2026-06-12", "breakfast");
    expect(mockInsert).toHaveBeenCalled();
    expect(result.ok).toBe(true);
  });

  it("returns error on DB failure without leaking internals", async () => {
    mockSelectWhere.mockReset().mockReturnValue(Promise.reject(new Error("pg secret error")));
    const result = await addSavedMealToLogAction("saved-meal-uuid", "2026-06-12", "breakfast");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).not.toMatch(/secret/i);
  });
});

describe("deleteSavedMealAction", () => {
  beforeEach(() => {
    vi.mocked(requireUserId).mockResolvedValue("user_test");
  });

  afterEach(() => vi.clearAllMocks());

  it("throws when user is not authenticated", async () => {
    vi.mocked(requireUserId).mockRejectedValue(new Error("UNAUTHENTICATED"));
    await expect(deleteSavedMealAction("saved-meal-uuid")).rejects.toThrow("UNAUTHENTICATED");
  });

  it("soft-deletes by calling update with deletedAt", async () => {
    await deleteSavedMealAction("saved-meal-uuid");
    expect(mockUpdate).toHaveBeenCalled();
    const setArg = (mockUpdateSet.mock.calls as unknown[][])[0]?.[0] as { deletedAt: Date };
    expect(setArg.deletedAt).toBeInstanceOf(Date);
  });

  it("returns ok after soft-delete", async () => {
    const result = await deleteSavedMealAction("saved-meal-uuid");
    expect(result.ok).toBe(true);
  });

  it("returns error on DB failure without leaking internals", async () => {
    mockUpdateWhere.mockRejectedValue(new Error("pg secret error"));
    const result = await deleteSavedMealAction("saved-meal-uuid");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).not.toMatch(/secret/i);
  });
});
