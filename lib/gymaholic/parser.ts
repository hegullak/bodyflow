/**
 * Gymaholic CSV parser: reads workout sets and validates before import.
 */

export interface GymaholicSetRow {
  workoutDate: string; // YYYY-MM-DD
  workoutDatetime: string; // ISO-like: YYYY-MM-DDTHH:mm
  workoutName: string;
  exerciseName: string;
  exerciseKey: string;
  setIndex: number;
  reps: number;
  weightKg: number;
}

export interface ParseError {
  rowNumber: number;
  reason: string;
}

export interface ParseResult {
  rows: GymaholicSetRow[];
  errors: ParseError[];
}

/**
 * Parse Gymaholic CSV text. Validates types and required fields but does
 * not check database uniqueness — that's done by the importer.
 */
export function parseGymaholicCsv(csvText: string): ParseResult {
  const lines = csvText.trim().split("\n");
  if (lines.length < 2) {
    return { rows: [], errors: [{ rowNumber: 0, reason: "Empty CSV or missing header" }] };
  }

  const headerLine = lines[0];
  const expectedHeaders = [
    "workout_date",
    "workout_datetime",
    "workout_name",
    "exercise_name",
    "exercise_key",
    "set_index",
    "reps",
    "weight_kg",
  ];

  const headers = headerLine.split(",").map((h) => h.trim());
  for (const h of expectedHeaders) {
    if (!headers.includes(h)) {
      return {
        rows: [],
        errors: [{ rowNumber: 0, reason: `Missing column: ${h}` }],
      };
    }
  }

  const indices = Object.fromEntries(headers.map((h, i) => [h, i]));
  const rows: GymaholicSetRow[] = [];
  const errors: ParseError[] = [];

  for (let i = 1; i < lines.length; i++) {
    const rowNumber = i + 1;
    const line = lines[i].trim();
    if (!line) continue;

    const cols = line.split(",");
    if (cols.length < expectedHeaders.length) {
      errors.push({ rowNumber, reason: "Not enough columns" });
      continue;
    }

    const get = (key: string): string => (cols[indices[key]] || "").trim();
    const getNum = (key: string): number | null => {
      const v = get(key);
      const n = parseFloat(v);
      return isNaN(n) ? null : n;
    };

    // Validate required fields exist and have correct types
    const workoutDate = get("workout_date");
    const workoutDatetime = get("workout_datetime");
    const workoutName = get("workout_name");
    const exerciseName = get("exercise_name");
    const exerciseKey = get("exercise_key");
    const setIndex = getNum("set_index");
    const reps = getNum("reps");
    const weightKg = getNum("weight_kg");

    const missingFields: string[] = [];
    if (!workoutDatetime) missingFields.push("workout_datetime");
    if (!exerciseName) missingFields.push("exercise_name");
    if (!exerciseKey) missingFields.push("exercise_key");
    if (setIndex == null) missingFields.push("set_index");
    if (reps == null) missingFields.push("reps");
    if (weightKg == null) missingFields.push("weight_kg");

    if (missingFields.length > 0) {
      errors.push({ rowNumber, reason: `Missing: ${missingFields.join(", ")}` });
      continue;
    }

    // Validate value constraints
    if (!isValidIsoDatetime(workoutDatetime)) {
      errors.push({ rowNumber, reason: `Invalid datetime: ${workoutDatetime}` });
      continue;
    }

    if (reps! < 0) {
      errors.push({ rowNumber, reason: `Invalid reps (must be >= 0): ${reps}` });
      continue;
    }

    if (weightKg! < 0) {
      errors.push({ rowNumber, reason: `Invalid weight (must be >= 0): ${weightKg}` });
      continue;
    }

    if (!Number.isInteger(setIndex!) || setIndex! <= 0) {
      errors.push({ rowNumber, reason: `Invalid set_index (must be positive int): ${setIndex}` });
      continue;
    }

    rows.push({
      workoutDate,
      workoutDatetime,
      workoutName: workoutName || "Workout",
      exerciseName,
      exerciseKey,
      setIndex: setIndex!,
      reps: Math.round(reps!),
      weightKg: Math.round(weightKg! * 100) / 100,
    });
  }

  return { rows, errors };
}

function isValidIsoDatetime(s: string): boolean {
  // Accept YYYY-MM-DDTHH:mm or YYYY-MM-DD HH:mm (after trim/normalize)
  const normalized = s.replace(" ", "T");
  const match = normalized.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/);
  return match != null;
}

/**
 * Group parsed rows by (workoutDatetime, exerciseKey) to understand structure.
 * Used by dry-run reporter.
 */
export function groupBySession(
  rows: GymaholicSetRow[],
): Map<string, Map<string, GymaholicSetRow[]>> {
  const sessions = new Map<string, Map<string, GymaholicSetRow[]>>();
  for (const row of rows) {
    if (!sessions.has(row.workoutDatetime)) {
      sessions.set(row.workoutDatetime, new Map());
    }
    const exMap = sessions.get(row.workoutDatetime)!;
    if (!exMap.has(row.exerciseKey)) {
      exMap.set(row.exerciseKey, []);
    }
    exMap.get(row.exerciseKey)!.push(row);
  }
  return sessions;
}
