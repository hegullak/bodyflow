import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth/current-user", () => ({ requireUserId: vi.fn() }));

const mockDeleteWhere = vi.fn(() => Promise.resolve());
const mockInsertValues = vi.fn(() => Promise.resolve());
const mockFindFirst = vi.fn();
const mockSelectWhere = vi.fn(() => Promise.resolve([]));

const mockDb = {
  insert: vi.fn(() => ({ values: mockInsertValues })),
  delete: vi.fn(() => ({ where: mockDeleteWhere })),
  select: vi.fn(() => ({ from: vi.fn(() => ({ where: mockSelectWhere })) })),
  query: {
    exerciseFavorites: { findFirst: mockFindFirst },
  },
};

vi.mock("@/db/client", () => ({ getDb: vi.fn(() => mockDb) }));

import { requireUserId } from "@/lib/auth/current-user";
import {
  getExerciseFavoriteIdsAction,
  toggleExerciseFavoriteAction,
} from "@/features/training/actions";

const USER_ID = "user_test123";
const EXERCISE_ID = "a1b2c3d4-0000-0000-0000-000000000001";
const FAV_ROW = { id: "fav-0001", userId: USER_ID, exerciseId: EXERCISE_ID, createdAt: new Date() };

beforeEach(() => {
  vi.mocked(requireUserId).mockResolvedValue(USER_ID);
  mockFindFirst.mockReset().mockResolvedValue(undefined);
  mockInsertValues.mockReset().mockResolvedValue(undefined);
  mockDeleteWhere.mockReset().mockResolvedValue(undefined);
  mockSelectWhere.mockReset().mockResolvedValue([]);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("getExerciseFavoriteIdsAction", () => {
  it("returns empty array when user has no favorites", async () => {
    const result = await getExerciseFavoriteIdsAction();
    expect(result).toEqual([]);
  });

  it("returns favoriteIds from DB", async () => {
    mockSelectWhere.mockResolvedValue([
      { exerciseId: EXERCISE_ID },
      { exerciseId: "b2c3d4e5-0000-0000-0000-000000000002" },
    ]);
    const result = await getExerciseFavoriteIdsAction();
    expect(result).toHaveLength(2);
    expect(result).toContain(EXERCISE_ID);
  });

  it("returns empty array on DB error (graceful fallback)", async () => {
    mockSelectWhere.mockRejectedValue(new Error("DB unavailable"));
    const result = await getExerciseFavoriteIdsAction();
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(0);
  });
});

describe("toggleExerciseFavoriteAction", () => {
  it("adds favorite when none exists", async () => {
    mockFindFirst.mockResolvedValue(undefined);

    const result = await toggleExerciseFavoriteAction(EXERCISE_ID);

    expect(result).toEqual({ ok: true, isFavorited: true });
    expect(mockInsertValues).toHaveBeenCalledWith({ userId: USER_ID, exerciseId: EXERCISE_ID });
  });

  it("removes favorite when one already exists", async () => {
    mockFindFirst.mockResolvedValue(FAV_ROW);

    const result = await toggleExerciseFavoriteAction(EXERCISE_ID);

    expect(result).toEqual({ ok: true, isFavorited: false });
    expect(mockDeleteWhere).toHaveBeenCalled();
    expect(mockInsertValues).not.toHaveBeenCalled();
  });

  it("returns ok:false with error message on DB failure", async () => {
    mockFindFirst.mockRejectedValue(new Error("connection refused"));

    const result = await toggleExerciseFavoriteAction(EXERCISE_ID);

    expect(result).toMatchObject({ ok: false });
    expect((result as { ok: false; error: string }).error).toContain("connection refused");
  });

  it("uses server-side userId, not a caller-supplied one", async () => {
    vi.mocked(requireUserId).mockResolvedValue("user_other");
    mockFindFirst.mockResolvedValue(undefined);

    await toggleExerciseFavoriteAction(EXERCISE_ID);

    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user_other" }),
    );
  });
});
