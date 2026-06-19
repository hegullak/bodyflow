'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { themeClassFor } from './themeClass';
import { THEME_TOKENS, type EchoTheme, type ThemeTokens } from './tokens';

const STORAGE_KEY = 'echoflow-theme';

type ThemeContextValue = {
  theme: EchoTheme;
  tokens: ThemeTokens;
  isDark: boolean;
  setTheme: (theme: EchoTheme) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({
  children,
  defaultTheme = 'slate',
}: {
  children: React.ReactNode;
  defaultTheme?: EchoTheme;
}) {
  const [theme, setThemeState] = useState<EchoTheme>(defaultTheme);

  // Read persisted theme on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as EchoTheme | null;
    const valid: EchoTheme[] = ['sand', 'slate', 'golden', 'training', 'measurement'];
    if (stored && valid.includes(stored)) {
      setThemeState(stored);
    }
  }, []);

  // Apply class to <html> and persist whenever theme changes
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('dark', 'golden', 'training', 'measurement');
    const cls = themeClassFor(theme);
    if (cls) root.classList.add(cls);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const setTheme = (next: EchoTheme) => setThemeState(next);
  const toggleTheme = () =>
    setThemeState((t) => (t === 'sand' ? 'slate' : 'sand'));

  return (
    <ThemeContext.Provider
      value={{
        theme,
        tokens: THEME_TOKENS[theme],
        isDark: theme !== 'sand',
        setTheme,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useAppTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useAppTheme must be used within ThemeProvider');
  return ctx;
}
