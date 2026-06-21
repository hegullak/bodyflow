/**
 * Inactivity detection and comeback messaging.
 *
 * Detects if user has been inactive (no logged meals, exercises, or measurements)
 * and returns appropriate comeback message using bodyflow brand language.
 */

import { BODYFLOW_COMEBACK_TITLE, BODYFLOW_COMEBACK_SLOGAN, INACTIVITY_THRESHOLD_DAYS } from "@/lib/brand";

export interface ComebackMessage {
  title: string;
  slogan: string;
}

/**
 * Get comeback message if user is inactive.
 *
 * Returns null if user is active or has no activity data.
 * Returns comeback message if user has been inactive for INACTIVITY_THRESHOLD_DAYS or more.
 *
 * @param lastActivityDate - ISO date string (YYYY-MM-DD) or undefined
 * @returns ComebackMessage if inactive, null otherwise
 */
export function getComebackMessage(lastActivityDate?: string | null): ComebackMessage | null {
  if (!lastActivityDate) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const lastActivity = new Date(lastActivityDate + "T00:00:00");
  const daysSinceActivity = Math.floor((today.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));

  if (daysSinceActivity >= INACTIVITY_THRESHOLD_DAYS) {
    return {
      title: BODYFLOW_COMEBACK_TITLE,
      slogan: BODYFLOW_COMEBACK_SLOGAN,
    };
  }

  return null;
}

/**
 * Get the number of days since last activity.
 *
 * Used for debugging and analytics.
 */
export function daysSinceActivity(lastActivityDate?: string | null): number | null {
  if (!lastActivityDate) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const lastActivity = new Date(lastActivityDate + "T00:00:00");
  return Math.floor((today.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));
}
