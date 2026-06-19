import type { EchoTheme } from "./tokens";

export type { EchoTheme };

export function themeClassFor(theme: EchoTheme): string {
  if (theme === "slate")  return "dark";
  if (theme === "golden") return "golden";
  return ""; // sand = :root, no extra class needed
}
