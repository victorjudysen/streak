// Numbers shown on the dashboard, calculated only from real completion records.

import { addDays, weekdayIndex } from "@/lib/dates";

// ── Contribution calendar (GitHub-style) ──────────────────────────────────────

export interface CalendarRange {
  start: string;
  end: string;
}

export interface CalendarDay {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
}

/** A null cell is padding before the range starts (e.g. before 1 January). */
export type CalendarCell = CalendarDay | null;

export interface Calendar {
  /** Sunday-first weeks, laid out column by column (7 cells per column). */
  cells: CalendarCell[];
  weeks: number;
  months: { label: string; column: number }[];
  /** Tasks completed within the range. */
  total: number;
}

/** 0 = Sunday … 6 = Saturday, as GitHub lays out its rows. */
function sundayIndex(isoDate: string): number {
  return new Date(`${isoDate}T00:00:00Z`).getUTCDay();
}

/** GitHub's default view: 53 week columns — the 52 full weeks before this one, then this week up to today. */
export function lastYearRange(today: string): CalendarRange {
  const thisSunday = addDays(today, -sundayIndex(today));
  return { start: addDays(thisSunday, -52 * 7), end: today };
}

/** A calendar year, cut off at today when it's the current year. */
export function yearRange(year: number, today: string): CalendarRange {
  const end = `${year}-12-31`;
  return { start: `${year}-01-01`, end: end < today ? end : today };
}

/**
 * The count at the top of each of the first three quarters of your active days.
 * Shading by quartile keeps one exceptional day from washing out the rest.
 */
export function quartiles(counts: number[]): [number, number, number] {
  const active = counts.filter((count) => count > 0).sort((a, b) => a - b);
  if (active.length === 0) return [0, 0, 0];
  const at = (p: number) => active[Math.floor(p * (active.length - 1))];
  return [at(0.25), at(0.5), at(0.75)];
}

/** Shade relative to your other days, like GitHub: level 1–4 by quartile of active days. */
export function levelFor(count: number, [q1, q2, q3]: [number, number, number]): CalendarDay["level"] {
  if (count <= 0) return 0;
  if (count <= q1) return 1;
  if (count <= q2) return 2;
  if (count <= q3) return 3;
  return 4;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function buildCalendar(range: CalendarRange, counts: Map<string, number>): Calendar {
  const firstSunday = addDays(range.start, -sundayIndex(range.start));

  const inRange: number[] = [];
  for (let day = range.start; day <= range.end; day = addDays(day, 1)) inRange.push(counts.get(day) ?? 0);
  const total = inRange.reduce((sum, count) => sum + count, 0);
  const thresholds = quartiles(inRange);

  const cells: CalendarCell[] = [];
  for (let day = firstSunday; day <= range.end; day = addDays(day, 1)) {
    if (day < range.start) {
      cells.push(null);
      continue;
    }
    const count = counts.get(day) ?? 0;
    cells.push({ date: day, count, level: levelFor(count, thresholds) });
  }

  const weeks = Math.ceil(cells.length / 7);
  const months: Calendar["months"] = [];
  let lastMonth = "";
  for (let column = 0; column < weeks; column++) {
    const first = cells.slice(column * 7, column * 7 + 7).find((cell) => cell !== null);
    if (!first) continue;
    const month = first.date.slice(0, 7);
    if (month === lastMonth) continue;
    lastMonth = month;
    months.push({ label: MONTHS[Number(month.slice(5)) - 1], column: column + 1 });
  }
  // Like GitHub, drop a first label that would collide with the next one.
  if (months.length > 1 && months[1].column - months[0].column < 3) months.shift();

  return { cells, weeks, months, total };
}

const LONG_MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function ordinal(n: number): string {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n}th`;
  return `${n}${["th", "st", "nd", "rd"][n % 10] ?? "th"}`;
}

/** GitHub's tooltip wording: "3 tasks done on September 27th." */
export function describeDay(day: CalendarDay): string {
  const date = `${LONG_MONTHS[Number(day.date.slice(5, 7)) - 1]} ${ordinal(Number(day.date.slice(8)))}`;
  if (day.count === 0) return `No tasks done on ${date}.`;
  return `${day.count} task${day.count === 1 ? "" : "s"} done on ${date}.`;
}

export interface StreakSummary {
  /** Days in a row, ending today or yesterday, with at least one task done. */
  current: number;
  /** Longest such run within the counted period. */
  best: number;
  /** Days in the period with at least one task done. */
  activeDays: number;
  /** Tasks completed in the period. */
  completed: number;
}

export function summarize(today: string, counts: Map<string, number>, since: string): StreakSummary {
  let best = 0;
  let run = 0;
  let activeDays = 0;
  let completed = 0;

  for (let day = since; day <= today; day = addDays(day, 1)) {
    const count = counts.get(day) ?? 0;
    completed += count;
    if (count > 0) {
      activeDays++;
      run++;
      best = Math.max(best, run);
    } else {
      run = 0;
    }
  }

  // An empty today does not break the streak yet — the day is still open.
  let current = 0;
  let day = (counts.get(today) ?? 0) > 0 ? today : addDays(today, -1);
  while (day >= since && (counts.get(day) ?? 0) > 0) {
    current++;
    day = addDays(day, -1);
  }

  return { current, best, activeDays, completed };
}

/** Completions for each day of the current Monday–Sunday week. */
export function thisWeek(today: string, counts: Map<string, number>): { date: string; count: number }[] {
  const monday = addDays(today, -weekdayIndex(today));
  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(monday, index);
    return { date, count: counts.get(date) ?? 0 };
  });
}

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/** The weekday with the most completions, once there is enough history to say so. */
export function strongestWeekday(counts: Map<string, number>, minimumActiveDays = 10): string | null {
  const totals = new Array(7).fill(0);
  let activeDays = 0;
  for (const [date, count] of counts) {
    if (count <= 0) continue;
    activeDays++;
    totals[weekdayIndex(date)] += count;
  }
  if (activeDays < minimumActiveDays) return null;
  return WEEKDAYS[totals.indexOf(Math.max(...totals))];
}
