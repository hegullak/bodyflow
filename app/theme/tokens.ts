/**
 * echo design system — tokens.ts
 *
 * Copy to src/theme/tokens.ts in any echo-family project.
 * Keep in sync with global.css (same values, different format).
 */

// ─── Theme names ─────────────────────────────────────────────────────────────

export type EchoTheme = "sand" | "slate" | "golden" | "training" | "measurement";

// ─── Background color (used as inline style on root View) ────────────────────

export const THEME_BG: Record<EchoTheme, string> = {
  sand:        "#D7D3CA",
  slate:       "#1A1E26",
  golden:      "#0E0C0A",
  training:    "#0D0908",
  measurement: "#09100A",
};

// ─── Semantic token map (mirrors CSS custom properties) ──────────────────────
//
// Use these when you need inline styles rather than Tailwind classes.
// Each key maps directly to a --token in global.css.

export type ThemeTokens = {
  bg:           string;
  bg2:          string;
  card:         string;
  card2:        string;
  border:       string;
  text1:        string;
  text2:        string;
  text3:        string;
  accent:       string;
  accentLight:  string;
  green:        string;
  greenLight:   string;
  amber:        string;
  amberLight:   string;
  red:          string;
  redLight:     string;
  sage:         string;
  sageLight:    string;
  dusk:         string;
  duskLight:    string;
  blue:         string;
  blueLight:    string;
  gold:         string;
  goldLight:    string;
};

export const THEME_TOKENS: Record<EchoTheme, ThemeTokens> = {
  sand: {
    bg:          "#D7D3CA",
    bg2:         "#CDC8BD",
    card:        "#CFCABF",
    card2:       "#C8C2B6",
    border:      "rgba(0, 0, 0, 0.10)",
    text1:       "#2A2620",
    text2:       "#5E574B",
    text3:       "#8C8578",
    accent:      "#3E7FA6",
    accentLight: "#D3E1EC",
    green:       "#3E7A5E",
    greenLight:  "#D4E3D9",
    amber:       "#8F6C1E",
    amberLight:  "#EBE1CC",
    red:         "#A44545",
    redLight:    "#ECD9D9",
    sage:        "#466B55",
    sageLight:   "#D6E1D8",
    dusk:        "#57506F",
    duskLight:   "#DDD8E6",
    blue:        "#356B8C",
    blueLight:   "#D3E1EC",
    gold:        "#8F7A2C",
    goldLight:   "#EBE1CC",
  },

  slate: {
    bg:          "#1A1E26",
    bg2:         "#141720",
    card:        "#222838",
    card2:       "#1C2030",
    border:      "rgba(255, 255, 255, 0.10)",
    text1:       "#EEF0F5",
    text2:       "#8E97AD",
    text3:       "#7A8CAD",
    accent:      "#7EB8D4",
    accentLight: "#1E3040",
    green:       "#7DD4A8",
    greenLight:  "#1A3028",
    amber:       "#D4A87D",
    amberLight:  "#2A2010",
    red:         "#D47D7D",
    redLight:    "#301818",
    sage:        "#7DB89A",
    sageLight:   "#182820",
    dusk:        "#9D8DC0",
    duskLight:   "#201830",
    blue:        "#9CCAE0",
    blueLight:   "#2A3C55",
    gold:        "#D4BA7A",
    goldLight:   "#3A2A16",
  },

  golden: {
    bg:          "#0E0C0A",
    bg2:         "#0B0906",
    card:        "#181410",
    card2:       "#221E18",
    border:      "rgba(255, 220, 140, 0.10)",
    text1:       "#F5F0E8",
    text2:       "#B8A882",
    text3:       "#6E5E40",
    accent:      "#F59E0B",
    accentLight: "rgba(245, 158,  11, 0.14)",
    green:       "#84CC16",
    greenLight:  "rgba(132, 204,  22, 0.14)",
    amber:       "#FBBF24",
    amberLight:  "rgba(251, 191,  36, 0.14)",
    red:         "#F87171",
    redLight:    "rgba(248, 113, 113, 0.14)",
    sage:        "#A3A352",
    sageLight:   "rgba(163, 163,  82, 0.14)",
    dusk:        "#C4A882",
    duskLight:   "rgba(196, 168, 130, 0.14)",
    blue:        "#60A5FA",
    blueLight:   "rgba( 96, 165, 250, 0.12)",
    gold:        "#F59E0B",
    goldLight:   "rgba(245, 158,  11, 0.14)",
  },

  training: {
    bg:          "#0D0707",
    bg2:         "#0A0505",
    card:        "#190C0C",
    card2:       "#211010",
    border:      "rgba(255, 100, 100, 0.12)",
    text1:       "#F5EDEC",
    text2:       "#B89090",
    text3:       "#6E4242",
    accent:      "#C83232",
    accentLight: "rgba(200,  50,  50, 0.16)",
    green:       "#84CC16",
    greenLight:  "rgba(132, 204,  22, 0.14)",
    amber:       "#E89040",
    amberLight:  "rgba(232, 144,  64, 0.14)",
    red:         "#F87171",
    redLight:    "rgba(248, 113, 113, 0.14)",
    sage:        "#A39052",
    sageLight:   "rgba(163, 144,  82, 0.14)",
    dusk:        "#C48080",
    duskLight:   "rgba(196, 128, 128, 0.14)",
    blue:        "#60A5FA",
    blueLight:   "rgba( 96, 165, 250, 0.12)",
    gold:        "#C86040",
    goldLight:   "rgba(200,  96,  64, 0.14)",
  },

  measurement: {
    bg:          "#09100A",
    bg2:         "#070D08",
    card:        "#0E1A10",
    card2:       "#142016",
    border:      "rgba(140, 210, 150, 0.10)",
    text1:       "#EDF5EE",
    text2:       "#8AAE90",
    text3:       "#4E6850",
    accent:      "#5AA86A",
    accentLight: "rgba( 90, 168, 106, 0.14)",
    green:       "#84CC16",
    greenLight:  "rgba(132, 204,  22, 0.14)",
    amber:       "#D4BA7A",
    amberLight:  "rgba(212, 186, 122, 0.14)",
    red:         "#F87171",
    redLight:    "rgba(248, 113, 113, 0.14)",
    sage:        "#82B882",
    sageLight:   "rgba(130, 184, 130, 0.14)",
    dusk:        "#8AA882",
    duskLight:   "rgba(138, 168, 130, 0.14)",
    blue:        "#60A5FA",
    blueLight:   "rgba( 96, 165, 250, 0.12)",
    gold:        "#A0C870",
    goldLight:   "rgba(160, 200, 112, 0.14)",
  },
};

// ─── Stripe / category colors ────────────────────────────────────────────────

export type StripeColor = "blue" | "amber" | "gold" | "green" | "dusk" | "sage" | "accent";

export const STRIPE_COLORS: Record<EchoTheme, Record<StripeColor, string>> = {
  sand: {
    blue:   "#356B8C",
    amber:  "#8F6C1E",
    gold:   "#8F7A2C",
    green:  "#3E7A5E",
    dusk:   "#57506F",
    sage:   "#466B55",
    accent: "#3E7FA6",
  },
  slate: {
    blue:   "#9CCAE0",
    amber:  "#D4A87D",
    gold:   "#D4BA7A",
    green:  "#7DD4A8",
    dusk:   "#9D8DC0",
    sage:   "#7DB89A",
    accent: "#7EB8D4",
  },
  golden: {
    blue:   "#60A5FA",
    amber:  "#FBBF24",
    gold:   "#F59E0B",
    green:  "#84CC16",
    dusk:   "#C4A882",
    sage:   "#A3A352",
    accent: "#F59E0B",
  },
  training: {
    blue:   "#60A5FA",
    amber:  "#E89040",
    gold:   "#C86040",
    green:  "#84CC16",
    dusk:   "#C48080",
    sage:   "#A39052",
    accent: "#C83232",
  },
  measurement: {
    blue:   "#60A5FA",
    amber:  "#D4BA7A",
    gold:   "#A0C870",
    green:  "#84CC16",
    dusk:   "#8AA882",
    sage:   "#82B882",
    accent: "#5AA86A",
  },
};

// ─── Person colors ────────────────────────────────────────────────────────────

export const PERSON_COLORS: Record<string, string> = {
  henning: "#C9A96E",
  trine:   "#82B8D4",
  as:      "#B09CCE",
};

export const PERSON_INITIALS: Record<string, string> = {
  henning: "H",
  trine:   "T",
  as:      "A",
};

// ─── Tab bar UI ───────────────────────────────────────────────────────────────

export const TAB_BAR_UI: Record<EchoTheme, { accent: string; inactive: string; bg: string; overlay: string }> = {
  sand: {
    accent:   "#3E7FA6",
    inactive: "#8C8578",
    bg:       "rgba(227, 223, 214, 0.95)",
    overlay:  "rgba(227, 223, 214, 0.18)",
  },
  slate: {
    accent:   "#7EB8D4",
    inactive: "#7A8CAD",
    bg:       "rgba(34, 40, 56, 0.92)",
    overlay:  "rgba(34, 40, 56, 0.15)",
  },
  golden: {
    accent:   "#F59E0B",
    inactive: "#6E5E40",
    bg:       "rgba(24, 20, 16, 0.92)",
    overlay:  "rgba(245, 158, 11, 0.08)",
  },
  training: {
    accent:   "#C83232",
    inactive: "#6E4242",
    bg:       "rgba(25, 12, 12, 0.92)",
    overlay:  "rgba(200, 50, 50, 0.08)",
  },
  measurement: {
    accent:   "#5AA86A",
    inactive: "#4E6850",
    bg:       "rgba(14, 26, 16, 0.92)",
    overlay:  "rgba(90, 168, 106, 0.08)",
  },
};
