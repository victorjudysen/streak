// Numbers shown on the dashboard, calculated only from real completion records.

import { addDays, weekdayIndex } from "@/lib/dates";

export const MAP_WEEKS = 53;

export interface MapDay {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
  isToday: boolean;
  isFuture: boolean;
}

export function levelFor(count: number): MapDay["level"] {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count <= 3) return 2;
  if (count <= 5) return 3;
  return 4;
}

/** First day shown on the activity map: the Monday 52 weeks before this week's Monday. */
export function mapStart(today: string): string {
  return addDays(today, -weekdayIndex(today) - (MAP_WEEKS - 1) * 7);
}

/** 53 Monday-first weeks ending with the current week, laid out column by column. */
export function buildMap(today: string, counts: Map<string, number>): MapDay[] {
  const start = mapStart(today);
  return Array.from({ length: MAP_WEEKS * 7 }, (_, offset) => {
    const date = addDays(start, offset);
    const count = counts.get(date) ?? 0;
    return { date, count, level: levelFor(count), isToday: date === today, isFuture: date > today };
  });
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Month labels positioned on the week column where each month begins. */
export function monthLabels(days: MapDay[]): { label: string; column: number }[] {
  const labels: { label: string; column: number }[] = [];
  let lastMonth = "";
  for (let column = 0; column < MAP_WEEKS; column++) {
    // A week belongs to the month of its Monday.
    const month = days[column * 7].date.slice(0, 7);
    if (month === lastMonth) continue;
    lastMonth = month;
    labels.push({ label: MONTHS[Number(month.slice(5)) - 1], column: column + 1 });
  }
  // Drop a partial first month whose label would collide with the next one.
  if (labels.length > 1 && labels[1].column - labels[0].column < 3) labels.shift();
  return labels;
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
