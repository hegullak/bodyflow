'use client';

import { useAppTheme } from '@/app/theme/ThemeProvider';
import type { EchoTheme } from '@/app/theme/tokens';
import { cn } from '@/lib/utils';

const BASE_THEMES: { value: EchoTheme; label: string; bg: string; accent: string }[] = [
  { value: 'slate',  label: 'Slate',  bg: '#1A1E26', accent: '#7EB8D4' },
  { value: 'sand',   label: 'Sand',   bg: '#D7D3CA', accent: '#3E7FA6' },
];

const FLOW_THEMES: { value: EchoTheme; label: string; bg: string; accent: string }[] = [
  { value: 'training',    label: 'Training',    bg: '#0D0906', accent: '#BE5228' },
  { value: 'golden',      label: 'Nutriant',    bg: '#0E0C0A', accent: '#F59E0B' },
  { value: 'measurement', label: 'Measurement', bg: '#09100A', accent: '#5AA86A' },
];

function ThemeButton({
  value, label, bg, accent, active, onSelect,
}: {
  value: EchoTheme; label: string; bg: string; accent: string;
  active: boolean; onSelect: (t: EchoTheme) => void;
}) {
  return (
    <button
      onClick={() => onSelect(value)}
      title={label}
      className="flex flex-col items-center gap-1.5"
    >
      <span
        className={cn(
          'flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all',
          active ? 'scale-110' : 'opacity-70 hover:opacity-100',
        )}
        style={{
          backgroundColor: bg,
          borderColor: active ? accent : 'transparent',
          boxShadow: active ? `0 0 0 2px ${accent}40` : 'none',
        }}
      >
        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: accent }} />
      </span>
      <span
        className="text-[11px] font-medium"
        style={{ color: active ? 'var(--text1)' : 'var(--text3)' }}
      >
        {label}
      </span>
    </button>
  );
}

export function ThemePicker() {
  const { theme, setTheme } = useAppTheme();

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        {BASE_THEMES.map((t) => (
          <ThemeButton key={t.value} {...t} active={theme === t.value} onSelect={setTheme} />
        ))}
      </div>

      <div>
        <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-[1.6px] text-[var(--text3)]">
          Flows
        </p>
        <div className="flex gap-4">
          {FLOW_THEMES.map((t) => (
            <ThemeButton key={t.value} {...t} active={theme === t.value} onSelect={setTheme} />
          ))}
        </div>
      </div>
    </div>
  );
}
