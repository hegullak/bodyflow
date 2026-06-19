import type { EchoTheme } from "./tokens";

export type { EchoTheme };

export function themeClassFor(theme: EchoTheme): string {
  if (theme === "slate")       return "dark";
  if (theme === "golden")      return "golden";
  if (theme === "training")    return "training";
  if (theme === "measurement") return "measurement";
  return ""; // sand = :root
}
