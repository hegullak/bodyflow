"use client";

import { createContext, useContext } from "react";
import { en } from "@/lib/i18n/en";
import type { Translations } from "@/lib/i18n/types";

const LangContext = createContext<Translations>(en);

export function LangProvider({
  children,
  translations,
}: {
  children: React.ReactNode;
  translations: Translations;
}) {
  return <LangContext.Provider value={translations}>{children}</LangContext.Provider>;
}

export function useT(): Translations {
  return useContext(LangContext);
}
