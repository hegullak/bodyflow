"use client";

import { createContext, useContext } from "react";
import type { Lang, Translations } from "@/lib/i18n/types";
import { getTranslations } from "@/lib/i18n";

const LangContext = createContext<Translations>(getTranslations("no"));

export function LangProvider({
  children,
  lang,
}: {
  children: React.ReactNode;
  lang: Lang;
}) {
  return (
    <LangContext.Provider value={getTranslations(lang)}>
      {children}
    </LangContext.Provider>
  );
}

export function useT(): Translations {
  return useContext(LangContext);
}
