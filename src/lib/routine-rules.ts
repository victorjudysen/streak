// Rules for routines (recurring tasks). Pure functions only, so they are easy to test.

import { addDays, weekdayIndex } from "@/lib/dates";

export interface Routine {
  id: string;
  seq: number;
  title: string;
  /** ISO weekdays: 1 = Monday … 7 = Sunday. */
  weekdays: number[];
  paused_at: string | null;
  archived_at: string | null;
  created_at: string;
}

export const ALL_WEEKDAYS = [1, 2, 3, 4, 5, 6, 7];
export const WEEKDAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** ISO weekday (1 = Monday) of an ISO date. */
export function isoWeekday(day: string): number {
  return weekdayIndex(day) + 1;
}

export function isScheduledOn(routine: Pick<Routine, "weekdays">, day: string): boolean {
  return routine.weekdays.includes(isoWeekday(day));
}

export function isActive(routine: Pick<Routine, "paused_at" | "archived_at">): boolean {
  return !routine.paused_at && !routine.archived_at;
}

/** Cleans weekday input from a form: unique, valid, sorted. */
export function parseWeekdays(values: unknown[]): number[] | { error: string } {
  const days = [...new Set(values.map(Number))].filter((n) => ALL_WEEKDAYS.includes(n)).sort((a, b) => a - b);
  if (days.length === 0) return { error: "Pick at least one day." };
  return days;
}

export function describeWeekdays(weekdays: number[]): string {
  const days = [...weekdays].sort((a, b) => a - b).join(",");
  if (days === "1,2,3,4,5,6,7") return "Every day";
  if (days === "1,2,3,4,5") return "Weekdays";
  if (days === "6,7") return "Weekends";
  return weekdays.map((d) => WEEKDAY_NAMES[d - 1]).join(", ");
}

/**
 * Scheduled days in a row, ending today, on which the routine was completed.
 * An unfinished today doesn't break the streak yet — the day is still open.
 * `doneDays` are the local dates on which any task from this routine was completed.
 */
export function routineStreak(
  routine: Pick<Routine, "weekdays">,
  doneDays: Set<string>,
  today: string,
  since: string,
): number {
  let streak = 0;
  for (let day = today; day >= since; day = addDays(day, -1)) {
    if (!isScheduledOn(routine, day)) continue;
    if (doneDays.has(day)) streak++;
    else if (day !== today) break;
  }
  return streak;
}
