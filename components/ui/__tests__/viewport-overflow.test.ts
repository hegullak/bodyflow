import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const root = resolve(__dirname, "../../..");

function read(rel: string) {
  return readFileSync(resolve(root, rel), "utf-8");
}

describe("horizontal viewport overflow prevention", () => {
  it("globals.css sets overflow-x: hidden on both html and body", () => {
    const css = read("app/globals.css");
    // Must appear together — body alone is not enough on mobile Chrome,
    // html alone is not enough when body overflows.
    expect(css).toMatch(/html[^{]*,\s*\nbody\s*\{[^}]*overflow-x:\s*hidden/);
  });

  it("Input component does not use focus:ring which creates an overflowing box-shadow", () => {
    const src = read("components/ui/field.tsx");
    expect(src).not.toContain("focus:ring-");
  });

  it("Select component does not use focus:ring", () => {
    const src = read("components/ui/field.tsx");
    // Redundant check — same file, but makes intent explicit per element type
    expect(src).not.toContain("focus:ring-");
  });

  it("Textarea component does not use focus:ring", () => {
    const src = read("components/ui/field.tsx");
    expect(src).not.toContain("focus:ring-");
  });

  it("sticky add-page header does not use negative horizontal margin that widens the page", () => {
    const src = read("features/nutrition/components/meal-add-view.tsx");
    expect(src).not.toContain("-mx-[");
  });
});
