/**
 * bodyflow brand domain.
 * Core brand constants, philosophy, and messaging logic.
 */

export const BODYFLOW_SLOGAN = "A little beats nothing. Every time.";

export const BODYFLOW_PHILOSOPHY = [
  "Adjust, don't reinvent.",
  "Not all at once.",
  "Adjust, don't ignore.",
] as const;

export const BODYFLOW_PRODUCT_PRINCIPLES = [
  "Warm and honest",
  "Practical and direct",
  "Non-shaming and supportive",
  "Focused on health gains over perfection",
] as const;

export const BODYFLOW_GOOD_MESSAGES = [
  "This is not in line with your stated goal.",
  "This is not dramatic.",
  "Start with one small thing.",
  "Rest is part of training.",
  "You do not need to fix everything today.",
] as const;

export const BODYFLOW_MESSAGES_TO_AVOID = [
  "You failed.",
  "You ruined your progress.",
  "Everything is fine when the data says otherwise.",
  "Transform your life.",
  "Become a new person.",
] as const;

export const BODYFLOW_CORE_FLOWS = {
  training: "training-flow",
  nutrition: "nutrition-flow",
  measurements: "measure-flow",
  mental: "mentalflow",
  recovery: "recoveryflow",
  battery: "batteryflow",
} as const;

/**
 * Validates primary slogan consistency.
 */
export function isPrimarySloganValid(text: string): boolean {
  return text === BODYFLOW_SLOGAN;
}

/**
 * Select appropriate message based on context.
 */
export function selectAppropriateMessage(context: "good" | "avoid"): string {
  const messages = context === "good" ? BODYFLOW_GOOD_MESSAGES : BODYFLOW_MESSAGES_TO_AVOID;
  return messages[Math.floor(Math.random() * messages.length)];
}

/**
 * Get philosophy guidance for user.
 */
export function getPhilosophyGuidance(): (typeof BODYFLOW_PHILOSOPHY)[number] {
  return BODYFLOW_PHILOSOPHY[Math.floor(Math.random() * BODYFLOW_PHILOSOPHY.length)];
}

/**
 * Validate product principle compliance.
 */
export function validatePrincipleAlignment(message: string): boolean {
  const avoided = BODYFLOW_MESSAGES_TO_AVOID.some(m => message.includes(m));
  return !avoided;
}
