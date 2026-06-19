'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { themeClassFor } from './themeClass';
import { THEME_TOKENS, type EchoTheme, type ThemeTokens } from './tokens';

const STORAGE_KEY = 'echoflow-theme';
const VALID_THEMES: EchoTheme[] = ['sand', 'slate', 'golden', 'training', 'measurement'];

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
  const pathname = usePathname();
  const skipSave = useRef(true);

  // Read persisted theme on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as EchoTheme | null;
    if (stored && VALID_THEMES.includes(stored)) {
      setThemeState(stored);
    }
  }, []);

  // Apply class to <html> on theme change OR navigation.
  // Also persists to localStorage, but skips the very first render to avoid
  // overwriting the stored theme before the read effect has a chance to load it.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('dark', 'golden', 'training', 'measurement');
    const cls = themeClassFor(theme);
    if (cls) root.classList.add(cls);

    if (skipSave.current) {
      skipSave.current = false;
    } else {
      localStorage.setItem(STORAGE_KEY, theme);
    }
  }, [theme, pathname]);

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
