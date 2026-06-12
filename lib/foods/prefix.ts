import { randomUUID } from "crypto";

export function getFoodCustomPrefixId(): string | null {
  const prefix = process.env.FOOD_CUSTOM_PREFIX_ID?.trim();
  return prefix || null;
}

export function requireFoodCustomPrefixId(): string {
  const prefix = getFoodCustomPrefixId();
  if (!prefix) {
    throw new Error("FOOD_CUSTOM_PREFIX_ID is not configured.");
  }
  return prefix;
}

export function buildCustomExternalId(): string {
  return `${requireFoodCustomPrefixId()}-${randomUUID()}`;
}

export function isCustomExternalId(externalId: string): boolean {
  const prefix = getFoodCustomPrefixId();
  if (!prefix) return false;
  return externalId.startsWith(`${prefix}-`);
}

export function formatCustomDisplayName(name: string): string {
  const prefix = getFoodCustomPrefixId();
  if (!prefix) return name;
  if (name.toLowerCase().startsWith(`${prefix.toLowerCase()}:`)) return name;
  return `${prefix}: ${name}`;
}
