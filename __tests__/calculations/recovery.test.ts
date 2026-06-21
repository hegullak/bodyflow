import { calcRecoveryBattery } from "@/lib/calculations/recovery";

// Helper
function score(input: Parameters<typeof calcRecoveryBattery>[0]) {
  return calcRecoveryBattery(input).score;
}

describe("calcRecoveryBattery", () => {
  test("no data → score 100, green", () => {
    const r = calcRecoveryBattery({});
    expect(r.score).toBe(100);
    expect(r.level).toBe("green");
  });

  test("low load + adequate calories → green", () => {
    const r = calcRecoveryBattery({
      trainingSessionsLast7Days: 2,
      averageCalories7d: 2200,
      dailyCalorieTarget: 2200,
    });
    expect(r.level).toBe("green");
  });

  test("4 sessions + adequate calories → yellow or green", () => {
    const r = calcRecoveryBattery({
      trainingSessionsLast7Days: 4,
      averageCalories7d: 2200,
      dailyCalorieTarget: 2200,
    });
    expect(["green", "yellow"]).toContain(r.level);
  });

  test("5 sessions + calorie deficit → orange", () => {
    const r = calcRecoveryBattery({
      trainingSessionsLast7Days: 3,
      completedCardioSlugs7d: ["longrun", "tempo-run"],
      averageCalories7d: 1700,
      dailyCalorieTarget: 2200,
    });
    expect(["orange", "red"]).toContain(r.level);
  });

  test("6 sessions + significant deficit → orange or red", () => {
    const r = calcRecoveryBattery({
      trainingSessionsLast7Days: 3,
      completedCardioSlugs7d: ["longrun", "tempo-run", "4x4-interval"],
      averageCalories7d: 1600,
      dailyCalorieTarget: 2400,
    });
    expect(["orange", "red"]).toContain(r.level);
    // Must not be green or yellow
    expect(r.score).toBeLessThan(55);
  });

  test("7 days in a row → at least orange (score ≤ 54)", () => {
    const r = calcRecoveryBattery({
      trainingDaysInRow: 7,
      trainingSessionsLast7Days: 4,
      averageCalories7d: 2400,
      dailyCalorieTarget: 2200,
    });
    expect(r.score).toBeLessThanOrEqual(54);
    expect(["orange", "red"]).toContain(r.level);
  });

  test("30 km running + 3 strength + deficit → at least orange", () => {
    const r = calcRecoveryBattery({
      trainingSessionsLast7Days: 3,
      completedCardioSlugs7d: ["longrun", "longrun", "tempo-run"],
      averageCalories7d: 2000,
      dailyCalorieTarget: 2300,
    });
    expect(r.score).toBeLessThanOrEqual(54);
  });

  test("high calories + high training → not automatically green", () => {
    const r = calcRecoveryBattery({
      trainingSessionsLast7Days: 5,
      completedCardioSlugs7d: ["longrun", "longrun"],
      trainingDaysInRow: 6,
      averageCalories7d: 2800,
      dailyCalorieTarget: 2200,
    });
    // Should be yellow/orange due to high load even when eating well
    expect(r.level).not.toBe("green");
  });

  test("fuel mismatch only triggers when training load is high", () => {
    // Low training + calorie deficit should not push to orange
    const r = calcRecoveryBattery({
      trainingSessionsLast7Days: 1,
      averageCalories7d: 1500,
      dailyCalorieTarget: 2200,
    });
    // Low load means deficit doesn't compound — should still be reasonable
    expect(r.score).toBeGreaterThan(50);
  });

  test("recovery gap adds penalty", () => {
    const rested = score({ trainingSessionsLast7Days: 3, daysSinceRestDay: 1 });
    const tired  = score({ trainingSessionsLast7Days: 3, daysSinceRestDay: 6 });
    expect(tired).toBeLessThan(rested);
  });

  test("messages do not praise overtraining", () => {
    const r = calcRecoveryBattery({
      trainingSessionsLast7Days: 5,
      completedCardioSlugs7d: ["longrun", "longrun"],
      averageCalories7d: 1700,
      dailyCalorieTarget: 2400,
    });
    expect(r.headline).not.toMatch(/great|bra|godt/i);
    expect(r.level).not.toBe("green");
  });
});
