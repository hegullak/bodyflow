/**
 * bodyflow brand language and constants.
 *
 * Core philosophy: "A little beats nothing. Every time."
 * These constants should be used sparingly in the app to guide tone and messaging.
 */

export const BODYFLOW_SLOGAN = "A little beats nothing. Every time.";

export const BODYFLOW_SUPPORTING_PHILOSOPHY = [
  "Adjust, don't reinvent.",
  "Not all at once.",
  "Adjust, don't ignore.",
];

export const BODYFLOW_COMEBACK_TITLE = "Skal vi starte igjen nå?";
export const BODYFLOW_COMEBACK_SLOGAN = BODYFLOW_SLOGAN;

export const BODYFLOW_PRODUCT_PRINCIPLES = [
  "Warm and honest",
  "Practical and direct",
  "Non-shaming and supportive",
  "Focused on health gains over perfection",
];

export const BODYFLOW_CORE_FLOWS = {
  training: "training-flow",
  nutrition: "nutrition-flow",
  measurements: "measure-flow",
  mental: "mentalflow",
  recovery: "recoveryflow",
  battery: "batteryflow",
};

export const BODYFLOW_GOOD_MESSAGES = [
  "This is not in line with your stated goal.",
  "This is not dramatic.",
  "Start with one small thing.",
  "Rest is part of training.",
  "You do not need to fix everything today.",
];

export const BODYFLOW_MESSAGES_TO_AVOID = [
  "You failed.",
  "You ruined your progress.",
  'Everything is fine when the data says otherwise.',
  "Transform your life.",
  "Become a new person.",
];

/**
 * Inactivity threshold in days.
 * User is considered inactive after this many days without meaningful activity.
 */
export const INACTIVITY_THRESHOLD_DAYS = 14;

/**
 * Validates that the primary slogan is never translated.
 * Used in tests to ensure brand consistency.
 */
export function validatePrimarySloganNotTranslated(slogan: string): boolean {
  return slogan === BODYFLOW_SLOGAN;
}
