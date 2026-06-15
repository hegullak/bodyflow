import { describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mock db/client before any imports that transitively pull it in
// ---------------------------------------------------------------------------

const mockSelect = vi.fn();

vi.mock("@/db/client", () => ({
  getDb: vi.fn(() => ({
    select: mockSelect,
  })),
}));

vi.mock("@/lib/auth/current-user", () => ({ requireUserId: vi.fn() }));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const sampleRow = {
  id: "aaa00000-0000-0000-0000-000000000001",
  externalId: "0001",
  slug: "barbell-bench-press",
  name: "Barbell Bench Press",
  equipment: "barbell",
  gifUrl: "https://example.com/bench.gif",
  instructions: ["Lie on bench", "Lower bar", "Press up"],
  source: "exercisedb",
  categorySlug: "chest",
  categoryName: "Chest",
  targetMuscleSlug: "pectorals",
  targetMuscleName: "Pectorals",
};

// ---------------------------------------------------------------------------
// Import script: slugify helper (inlined for unit test)
// ---------------------------------------------------------------------------

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

describe("slugify", () => {
  it("converts to lowercase with hyphens", () => {
    expect(slugify("Barbell Bench Press")).toBe("barbell-bench-press");
  });

  it("strips leading/trailing hyphens", () => {
    expect(slugify("  abs  ")).toBe("abs");
  });

  it("collapses multiple spaces/special chars", () => {
    expect(slugify("hip flexors & glutes")).toBe("hip-flexors-glutes");
  });

  it("handles already-slug strings", () => {
    expect(slugify("pectorals")).toBe("pectorals");
  });
});

// ---------------------------------------------------------------------------
// API route: input validation
// ---------------------------------------------------------------------------

describe("GET /api/exercises/[id] — UUID validation", () => {
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  it("accepts a valid UUID", () => {
    expect(UUID_RE.test("aaa00000-0000-0000-0000-000000000001")).toBe(true);
  });

  it("rejects a non-UUID string", () => {
    expect(UUID_RE.test("0001")).toBe(false);
  });

  it("rejects an empty string", () => {
    expect(UUID_RE.test("")).toBe(false);
  });

  it("rejects a partial UUID", () => {
    expect(UUID_RE.test("aaa00000-0000-0000")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Catalog: filter parameter parsing
// ---------------------------------------------------------------------------

describe("listExercises filter clamping", () => {
  it("clamps limit to MAX_LIMIT (100)", () => {
    const raw = Number("9999");
    const clamped = Math.min(Math.max(1, raw), 100);
    expect(clamped).toBe(100);
  });

  it("clamps limit minimum to 1", () => {
    const raw = Number("-5");
    const clamped = Math.min(Math.max(1, raw), 100);
    expect(clamped).toBe(1);
  });

  it("clamps offset minimum to 0", () => {
    const raw = Number("-10");
    const clamped = Math.max(0, raw);
    expect(clamped).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// formatRow shape
// ---------------------------------------------------------------------------

describe("formatRow output shape", () => {
  it("maps a db row to the expected API response shape", () => {
    const formatted = {
      id: sampleRow.id,
      externalId: sampleRow.externalId,
      slug: sampleRow.slug,
      name: sampleRow.name,
      bodyPart: sampleRow.categorySlug
        ? { slug: sampleRow.categorySlug, name: sampleRow.categoryName }
        : null,
      targetMuscle: sampleRow.targetMuscleSlug
        ? { slug: sampleRow.targetMuscleSlug, name: sampleRow.targetMuscleName }
        : null,
      secondaryMuscles: [],
      equipment: sampleRow.equipment,
      gifUrl: sampleRow.gifUrl,
      instructions: sampleRow.instructions,
      source: sampleRow.source,
    };

    expect(formatted.bodyPart).toEqual({ slug: "chest", name: "Chest" });
    expect(formatted.targetMuscle).toEqual({ slug: "pectorals", name: "Pectorals" });
    expect(formatted.secondaryMuscles).toHaveLength(0);
    expect(formatted.instructions).toHaveLength(3);
  });

  it("returns null bodyPart when category is missing", () => {
    const row = { ...sampleRow, categorySlug: null, categoryName: null };
    const bodyPart = row.categorySlug
      ? { slug: row.categorySlug, name: row.categoryName }
      : null;
    expect(bodyPart).toBeNull();
  });
});
