// Turning what people type ("tomorrow", "fri", "12 oct", "2026-10-12") into a day.
// Pure functions only, so they are easy to test.

import { addDays, formatDay, weekdayIndex } from "@/lib/dates";

/** How far ahead a task can be scheduled. */
export const MAX_DAYS_AHEAD = 365;

const WEEKDAYS: Record<string, number> = {
  mon: 0, monday: 0,
  tue: 1, tues: 1, tuesday: 1,
  wed: 2, weds: 2, wednesday: 2,
  thu: 3, thur: 3, thurs: 3, thursday: 3,
  fri: 4, friday: 4,
  sat: 5, saturday: 5,
  sun: 6, sunday: 6,
};

const MONTHS: Record<string, number> = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4,
  may: 5, jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8,
  sep: 9, sept: 9, september: 9, oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12,
};

function isoDate(year: number, month: number, day: number): string | null {
  const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const date = new Date(`${iso}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === iso ? iso : null;
}

/**
 * The day a word or short phrase means, relative to `today`, or null if it isn't one.
 * Weekday names mean the next such day (on a Monday, "mon" is next Monday).
 * A day and month without a year means the next time that date comes round.
 */
export function parseDayWord(input: string, today: string): string | null {
  const text = input.trim().toLowerCase().replace(/[.,]/g, "").replace(/\s+/g, " ");
  if (!text) return null;
  if (text === "today") return today;
  if (["tomorrow", "tmrw", "tmr", "tmw"].includes(text)) return addDays(today, 1);

  const weekday = WEEKDAYS[text.replace(/^next /, "")];
  if (weekday !== undefined) {
    const ahead = ((weekday - weekdayIndex(today) + 7) % 7) || 7;
    return addDays(today, ahead);
  }

  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return isoDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));

  // "12 oct", "12 october 2026", "oct 12", "october 12 2026"
  const dayFirst = text.match(/^(\d{1,2})(?:st|nd|rd|th)? ([a-z]+)(?: (\d{4}))?$/);
  const monthFirst = text.match(/^([a-z]+) (\d{1,2})(?:st|nd|rd|th)?(?: (\d{4}))?$/);
  const parts = dayFirst
    ? { day: Number(dayFirst[1]), month: MONTHS[dayFirst[2]], year: dayFirst[3] }
    : monthFirst
      ? { day: Number(monthFirst[2]), month: MONTHS[monthFirst[1]], year: monthFirst[3] }
      : null;
  if (!parts?.month) return null;
  if (parts.year) return isoDate(Number(parts.year), parts.month, parts.day);
  const thisYear = Number(today.slice(0, 4));
  const candidate = isoDate(thisYear, parts.month, parts.day);
  if (candidate && candidate >= today) return candidate;
  return isoDate(thisYear + 1, parts.month, parts.day);
}

/**
 * "tomorrow: Call the bank" → { day, title }. Text before a colon only counts as a
 * day if it parses as one, so "Note: buy milk" stays a task called "Note: buy milk".
 */
export function splitDatePrefix(line: string, today: string): { day: string | null; title: string } {
  const match = line.match(/^\s*([^:]{1,24}):\s*([\s\S]+)$/);
  if (match) {
    const day = parseDayWord(match[1], today);
    if (day) return { day, title: match[2].trim() };
  }
  return { day: null, title: line.trim() };
}

/** Tasks can be planned for today up to a year ahead — never for a closed day. */
export function checkScheduleDay(day: string, today: string): { day: string } | { error: string } {
  if (day < today) return { error: "That day has already passed. Pick today or a later day." };
  if (day > addDays(today, MAX_DAYS_AHEAD)) return { error: "Pick a day within the next year." };
  return { day };
}

/** "Today", "Tomorrow", "Fri 9 Oct", or "Fri 9 Oct 2027" for another year. */
export function describeScheduleDay(day: string, today: string): string {
  if (day === today) return "Today";
  if (day === addDays(today, 1)) return "Tomorrow";
  const label = formatDay(day, { weekday: "short", day: "numeric", month: "short" });
  return day.slice(0, 4) === today.slice(0, 4) ? label : `${label} ${day.slice(0, 4)}`;
}
