export type { Lang, Translations } from "./types";
export { en } from "./en";
export { no } from "./no";

import type { Lang, Translations } from "./types";
import { en } from "./en";
import { no } from "./no";

export function getTranslations(lang: Lang): Translations {
  return lang === "en" ? en : no;
}
