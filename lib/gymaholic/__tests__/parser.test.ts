import { describe, expect, it } from "vitest";
import { parseGymaholicCsv } from "../parser";

const validCsv = `workout_date,workout_datetime,workout_name,exercise_name,exercise_key,set_index,reps,weight_kg
2020-10-03,2020-10-03T10:39,Workout,Bench Press,barbell-bench-press,1,8,60
2020-10-03,2020-10-03T10:39,Workout,Bench Press,barbell-bench-press,2,8,60
2020-10-03,2020-10-03T10:39,Workout,Squat,barbell-squat,1,5,100`;

describe("parseGymaholicCsv", () => {
  it("parses valid CSV", () => {
    const result = parseGymaholicCsv(validCsv);
    expect(result.rows).toHaveLength(3);
    expect(result.errors).toHaveLength(0);
    expect(result.rows[0]).toEqual({
      workoutDate: "2020-10-03",
      workoutDatetime: "2020-10-03T10:39",
      workoutName: "Workout",
      exerciseName: "Bench Press",
      exerciseKey: "barbell-bench-press",
      setIndex: 1,
      reps: 8,
      weightKg: 60,
    });
  });

  it("rejects missing columns", () => {
    const badCsv = "workout_date,exercise_name\n2020-10-03,Bench";
    const result = parseGymaholicCsv(badCsv);
    expect(result.rows).toHaveLength(0);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("rejects missing required fields", () => {
    const badCsv = `workout_date,workout_datetime,workout_name,exercise_name,exercise_key,set_index,reps,weight_kg
2020-10-03,,Workout,Bench,barbell-bench-press,1,8,60`;
    const result = parseGymaholicCsv(badCsv);
    expect(result.rows).toHaveLength(0);
    expect(result.errors[0].reason).toContain("workout_datetime");
  });

  it("rejects invalid reps (negative)", () => {
    const badCsv = `workout_date,workout_datetime,workout_name,exercise_name,exercise_key,set_index,reps,weight_kg
2020-10-03,2020-10-03T10:39,Workout,Bench,barbell-bench-press,1,-1,60`;
    const result = parseGymaholicCsv(badCsv);
    expect(result.rows).toHaveLength(0);
    expect(result.errors[0].reason).toContain("reps");
  });

  it("allows zero reps (bodyweight exercises)", () => {
    const csv = `workout_date,workout_datetime,workout_name,exercise_name,exercise_key,set_index,reps,weight_kg
2020-10-03,2020-10-03T10:39,Workout,Pull-up,pull-up,1,0,0`;
    const result = parseGymaholicCsv(csv);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].reps).toBe(0);
  });

  it("rejects invalid weight", () => {
    const badCsv = `workout_date,workout_datetime,workout_name,exercise_name,exercise_key,set_index,reps,weight_kg
2020-10-03,2020-10-03T10:39,Workout,Bench,barbell-bench-press,1,8,-5`;
    const result = parseGymaholicCsv(badCsv);
    expect(result.rows).toHaveLength(0);
    expect(result.errors[0].reason).toContain("weight");
  });

  it("rejects invalid set_index", () => {
    const badCsv = `workout_date,workout_datetime,workout_name,exercise_name,exercise_key,set_index,reps,weight_kg
2020-10-03,2020-10-03T10:39,Workout,Bench,barbell-bench-press,0,8,60`;
    const result = parseGymaholicCsv(badCsv);
    expect(result.rows).toHaveLength(0);
    expect(result.errors[0].reason).toContain("set_index");
  });

  it("handles decimal weights", () => {
    const csv = `workout_date,workout_datetime,workout_name,exercise_name,exercise_key,set_index,reps,weight_kg
2020-10-03,2020-10-03T10:39,Workout,Face Pull,face-pull,1,12,13.75`;
    const result = parseGymaholicCsv(csv);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].weightKg).toBe(13.75);
  });

  it("trims whitespace from strings", () => {
    const csv = `workout_date,workout_datetime,workout_name,exercise_name,exercise_key,set_index,reps,weight_kg
2020-10-03,2020-10-03T10:39, Workout ,  Bench Press  , barbell-bench-press ,1,8,60`;
    const result = parseGymaholicCsv(csv);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].workoutName).toBe("Workout");
    expect(result.rows[0].exerciseName).toBe("Bench Press");
  });
});
