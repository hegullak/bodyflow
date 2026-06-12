import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { bodyMeasurements, dailyBodyLogs, userProfiles } from "@/db/schema";
import { scopeBy } from "@/lib/auth/scope";
import {
  calculateAgeYears,
  calculateBmi,
  calculateBmrMifflinStJeor,
  calculateCalorieBalance,
  calculateTdee,
  formatBmiCategory,
  getBmiCategory,
} from "@/lib/calculations/body-metrics";
import { todayIsoDate } from "@/lib/utils";

export async function getDashboardData(userId: string, referenceDate = new Date()) {
  const db = getDb();
  const today = todayIsoDate(referenceDate);

  const [profile, todayLog, recentLogs, latestMeasurement] = await Promise.all([
    db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, userId),
    }),
    db.query.dailyBodyLogs.findFirst({
      where: scopeBy(dailyBodyLogs.userId, userId, eq(dailyBodyLogs.logDate, today)),
    }),
    db.query.dailyBodyLogs.findMany({
      where: scopeBy(dailyBodyLogs.userId, userId),
      orderBy: [desc(dailyBodyLogs.logDate)],
      limit: 30,
    }),
    db.query.bodyMeasurements.findFirst({
      where: scopeBy(bodyMeasurements.userId, userId),
      orderBy: [desc(bodyMeasurements.measuredOn)],
    }),
  ]);

  const latestWeightLog = recentLogs.find((log) => log.weightKg != null) ?? null;
  const latestWeight = latestWeightLog?.weightKg ?? null;
  const heightCm = profile?.heightCm ?? null;

  const bmi =
    latestWeight != null && heightCm != null
      ? calculateBmi(latestWeight, heightCm)
      : null;
  const bmiCategory = bmi != null ? getBmiCategory(bmi) : null;

  const ageYears = profile
    ? calculateAgeYears(referenceDate, profile.birthYear, profile.birthDate)
    : null;
  const bmr =
    latestWeight != null && heightCm != null && ageYears != null
      ? calculateBmrMifflinStJeor(latestWeight, heightCm, ageYears, profile?.sex)
      : null;
  const tdee =
    bmr != null && profile?.activityLevel
      ? calculateTdee(bmr, profile.activityLevel)
      : null;

  const calorieReference = profile?.dailyCalorieTarget ?? tdee;
  const calorieBalance = calculateCalorieBalance(todayLog?.calorieIntake, calorieReference);

  return {
    profileComplete: Boolean(profile?.heightCm),
    todayLog,
    latestWeight,
    latestWeightDate: latestWeightLog?.logDate ?? null,
    bmi,
    bmiCategory: bmiCategory ? formatBmiCategory(bmiCategory) : null,
    tdee,
    dailyCalorieTarget: profile?.dailyCalorieTarget ?? null,
    calorieReference,
    todayCalories: todayLog?.calorieIntake ?? null,
    calorieBalance,
    latestMeasurement,
  };
}

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;
