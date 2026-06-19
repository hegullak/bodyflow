'use client';

import { useAppTheme } from '@/app/theme/ThemeProvider';
import type { EchoTheme } from '@/app/theme/tokens';

const THEMES: { value: EchoTheme; label: string; bg: string; accent: string }[] = [
  { value: 'slate', label: 'Slate',  bg: '#1A1E26', accent: '#7EB8D4' },
  { value: 'sand',  label: 'Sand',   bg: '#D7D3CA', accent: '#3E7FA6' },
  { value: 'golden', label: 'Golden', bg: '#0E0C0A', accent: '#F59E0B' },
];

export function ThemePicker() {
  const { theme, setTheme } = useAppTheme();

  return (
    <div className="flex gap-3">
      {THEMES.map((t) => (
        <button
          key={t.value}
          onClick={() => setTheme(t.value)}
          title={t.label}
          className="flex flex-col items-center gap-1.5 group"
        >
          <span
            className="flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all"
            style={{
              backgroundColor: t.bg,
              borderColor: theme === t.value ? t.accent : 'transparent',
              boxShadow: theme === t.value ? `0 0 0 2px ${t.accent}40` : 'none',
            }}
          >
            <span
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: t.accent }}
            />
          </span>
          <span
            className="text-[11px] font-medium"
            style={{ color: theme === t.value ? 'var(--text1)' : 'var(--text3)' }}
          >
            {t.label}
          </span>
        </button>
      ))}
    </div>
  );
}
