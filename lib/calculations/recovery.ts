// Recovery Battery — rule-based readiness estimate.
// No AI, no wearables, no medical claims.
// Start at 100 and subtract based on training load, recovery gap, and fuel mismatch.

export type RecoveryBatteryLevel = "green" | "yellow" | "orange" | "red";

export type RecoveryBatteryInput = {
  // Training load
  trainingSessionsLast7Days?: number;      // strength sessions
  trainingDaysInRow?: number;              // consecutive days with any training
  daysSinceRestDay?: number;              // 0 = rested today/yesterday
  hardSessionsLast7Days?: number;          // strength = hard; we treat all strength as hard
  fullBodySessionsLast7Days?: number;
  // Running (estimated km from cardio slugs when no direct distance)
  runningDistanceLast7DaysKm?: number;
  completedCardioSlugs7d?: string[];       // for slug-to-km estimation
  // Nutrition
  todayCalories?: number;
  averageCalories3d?: number;
  averageCalories7d?: number;
  dailyCalorieTarget?: number;
  // Context
  goalType?: "weight_loss" | "maintenance" | "muscle_gain" | "general_health";
};

export type RecoveryBatteryResult = {
  score: number;                  // 0–100
  level: RecoveryBatteryLevel;
  headline: string;
  explanation: string;
  action: string;
  factors: {
    trainingLoad: number;         // points subtracted
    recoveryGap: number;
    fuelMismatch: number;
  };
};

// km estimates per cardio slug (conservative)
const SLUG_KM: Record<string, number> = {
  longrun:       12,
  "tempo-run":    8,
  "4x4-interval": 4,
  interval:       5,
};

function estimateRunKm(slugs: string[]): number {
  return slugs.reduce((s, slug) => s + (SLUG_KM[slug] ?? 3), 0);
}

export function calcRecoveryBattery(input: RecoveryBatteryInput): RecoveryBatteryResult {
  const {
    trainingSessionsLast7Days = 0,
    trainingDaysInRow = 0,
    daysSinceRestDay = 0,
    hardSessionsLast7Days,
    fullBodySessionsLast7Days,
    completedCardioSlugs7d = [],
    averageCalories3d,
    averageCalories7d,
    dailyCalorieTarget,
  } = input;

  const effectiveHard = hardSessionsLast7Days ?? trainingSessionsLast7Days;
  const effectiveFullBody = fullBodySessionsLast7Days ?? trainingSessionsLast7Days;
  const runKm = input.runningDistanceLast7DaysKm ?? estimateRunKm(completedCardioSlugs7d);
  const totalSessions = trainingSessionsLast7Days + completedCardioSlugs7d.length;

  // ── Training load factor ────────────────────────────────────────────────
  let trainingLoad = 0;

  // Session volume
  if (totalSessions <= 3)      trainingLoad += Math.round(totalSessions * 3);
  else if (totalSessions === 4) trainingLoad += 15;
  else if (totalSessions === 5) trainingLoad += 25;
  else                          trainingLoad += 35;

  // Consecutive training days
  if (trainingDaysInRow >= 7)      trainingLoad += 35;
  else if (trainingDaysInRow >= 5) trainingLoad += 20;
  else if (trainingDaysInRow >= 4) trainingLoad += 10;

  // Hard session density
  if (effectiveHard >= 3) trainingLoad += 10;

  // Full-body frequency (taxing CNS more than isolation work)
  if (effectiveFullBody >= 4)      trainingLoad += 15;
  else if (effectiveFullBody >= 3) trainingLoad += 10;
  else if (effectiveFullBody >= 2) trainingLoad += 5;

  // Running volume
  if (runKm >= 30)      trainingLoad += 20;
  else if (runKm >= 20) trainingLoad += 10;
  else if (runKm >= 12) trainingLoad += 5;

  // ── Recovery gap factor ─────────────────────────────────────────────────
  let recoveryGap = 0;
  if (daysSinceRestDay >= 7)      recoveryGap += 35;
  else if (daysSinceRestDay >= 5) recoveryGap += 20;
  else if (daysSinceRestDay >= 3) recoveryGap += 10;

  // ── Fuel mismatch factor ────────────────────────────────────────────────
  let fuelMismatch = 0;
  const highLoad = trainingLoad >= 25; // meaningful training stress

  if (dailyCalorieTarget != null && dailyCalorieTarget > 0) {
    const avg7d = averageCalories7d;
    const avg3d = averageCalories3d;

    if (avg7d != null) {
      const deficit7d = dailyCalorieTarget - avg7d;
      if (highLoad) {
        if (deficit7d >= 400)      fuelMismatch += 20;
        else if (deficit7d >= 200) fuelMismatch += 10;
      }
    }

    if (avg3d != null) {
      const deficit3d = dailyCalorieTarget - avg3d;
      if (highLoad && deficit3d >= 500) fuelMismatch += 20;
    }
  }

  // ── Raw score ───────────────────────────────────────────────────────────
  let score = 100 - trainingLoad - recoveryGap - fuelMismatch;

  // ── Override rules (hard floors) ───────────────────────────────────────
  const avg7d = averageCalories7d;
  const deficit7d = dailyCalorieTarget != null && avg7d != null ? dailyCalorieTarget - avg7d : 0;

  // 7+ days in a row → never green
  if (trainingDaysInRow >= 7) score = Math.min(score, 54);

  // 6+ sessions + calorie deficit → never green
  if (totalSessions >= 6 && deficit7d > 400) score = Math.min(score, 54);

  // 30 km running + 3+ strength + deficit → at least orange
  if (runKm >= 30 && trainingSessionsLast7Days >= 3 && deficit7d > 0) score = Math.min(score, 54);

  score = Math.round(Math.max(0, Math.min(100, score)));

  // ── Level mapping ───────────────────────────────────────────────────────
  let level: RecoveryBatteryLevel;
  if (score >= 75)      level = "green";
  else if (score >= 55) level = "yellow";
  else if (score >= 35) level = "orange";
  else                  level = "red";

  // ── Messaging ───────────────────────────────────────────────────────────
  const messages = buildMessages(level, {
    trainingLoad,
    recoveryGap,
    fuelMismatch,
    highLoad,
    trainingDaysInRow,
    deficit7d,
    totalSessions,
    runKm,
  });

  return {
    score,
    level,
    ...messages,
    factors: { trainingLoad, recoveryGap, fuelMismatch },
  };
}

type MsgContext = {
  trainingLoad: number;
  recoveryGap: number;
  fuelMismatch: number;
  highLoad: boolean;
  trainingDaysInRow: number;
  deficit7d: number;
  totalSessions: number;
  runKm: number;
};

function buildMessages(level: RecoveryBatteryLevel, ctx: MsgContext) {
  const { fuelMismatch, recoveryGap, trainingDaysInRow, totalSessions, runKm } = ctx;

  const hasFuelMismatch  = fuelMismatch > 0;
  const hasRecoveryGap   = recoveryGap > 0;
  const highConsecutive  = trainingDaysInRow >= 5;

  if (level === "red") {
    if (hasFuelMismatch && ctx.highLoad) {
      return {
        headline: "Høy belastning, lavt inntak",
        explanation: "Du trener mye samtidig som energiinntaket er lavt. Det er kombinasjonen som tapper batteriet — ikke treningen alene.",
        action: "Spis mer i dag, og planlegg en lett økt eller hviledag.",
      };
    }
    if (highConsecutive) {
      return {
        headline: `${trainingDaysInRow} dager på rad`,
        explanation: "Kroppen trenger avbrekk for å absorbere treningsstimulansen. Hvile er et treningsgrep, ikke et avvik.",
        action: "Ta en hviledag eller lett aktiv restitusjon.",
      };
    }
    return {
      headline: "Batteriet er lavt",
      explanation: "Summen av treningsbelastning og restitusjon er i ubalanse denne uken.",
      action: "Hvile eller lett aktivitet er neste smarte grep.",
    };
  }

  if (level === "orange") {
    if (hasFuelMismatch) {
      return {
        headline: "Trening uten nok drivstoff",
        explanation: `Ukesnittet er under dagsmålet, mens du har ${totalSessions} treningsøkter bak deg. Kroppen kan trenge mer rom.`,
        action: "Prioriter mat og søvn de neste dagene.",
      };
    }
    if (hasRecoveryGap) {
      return {
        headline: "Har du hatt hviledager?",
        explanation: "Det ser ut til at du har trent flere dager uten pause. Restitusjon skjer i hvilen, ikke under treningsøkten.",
        action: "Legg inn en hviledag eller lett økt denne uken.",
      };
    }
    return {
      headline: "Dette er mye belastning",
      explanation: `${totalSessions} treningsøkter${runKm > 0 ? ` og ca. ${Math.round(runKm)} km løping` : ""} på én uke er krevende. Neste smarte grep er lett økt eller hvile.`,
      action: "Vurder å dempe intensiteten litt.",
    };
  }

  if (level === "yellow") {
    if (hasFuelMismatch) {
      return {
        headline: "Bra uke — men energiinntaket er litt lavt",
        explanation: "Treningsbelastningen er håndterbar, men kaloriene holder ikke helt tritt med treningsmengden.",
        action: "Spis litt mer de neste dagene for å støtte restitusjon.",
      };
    }
    return {
      headline: "Solid uke",
      explanation: "God treningsinnsats. Kroppen jobber, men har fremdeles kapasitet.",
      action: "Hold treningskvaliteten — og husk nok søvn.",
    };
  }

  // green
  return {
    headline: "Godt restituert",
    explanation: "Treningsbelastning og energiinntak er i god balanse. Kroppen er klar.",
    action: "Bra grunnlag for en god økt.",
  };
}

// ── Helpers for display ─────────────────────────────────────────────────────

export function levelColor(level: RecoveryBatteryLevel): string {
  switch (level) {
    case "green":  return "#22c55e";
    case "yellow": return "#eab308";
    case "orange": return "#f97316";
    case "red":    return "#ef4444";
  }
}

export function levelBg(level: RecoveryBatteryLevel): string {
  switch (level) {
    case "green":  return "rgba(34,197,94,0.08)";
    case "yellow": return "rgba(234,179,8,0.08)";
    case "orange": return "rgba(249,115,22,0.08)";
    case "red":    return "rgba(239,68,68,0.08)";
  }
}
