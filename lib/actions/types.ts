export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export function flattenZodErrors(err: {
  issues: { path: (string | number)[]; message: string }[];
}): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of err.issues) {
    const key = issue.path.join(".") || "_";
    fieldErrors[key] ??= [];
    fieldErrors[key].push(issue.message);
  }
  return fieldErrors;
}
