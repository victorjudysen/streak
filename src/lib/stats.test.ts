import { describe, expect, it } from "vitest";
import {
  buildCalendar,
  describeDay,
  lastYearRange,
  levelFor,
  quartiles,
  strongestWeekday,
  summarize,
  thisWeek,
  yearRange,
} from "@/lib/stats";

const TODAY = "2026-09-24"; // a Thursday

const counts = (entries: Record<string, number>) => new Map(Object.entries(entries));

const weekday = (date: string) => new Date(`${date}T00:00:00Z`).getUTCDay(); // 0 = Sunday

describe("contribution calendar", () => {
  it("shows 53 Sunday-first week columns ending today, like GitHub", () => {
    const range = lastYearRange(TODAY); // Thursday 24 Sept
    expect(weekday(range.start)).toBe(0);
    const calendar = buildCalendar(range, new Map());
    expect(calendar.weeks).toBe(53);
    expect(calendar.cells.at(-1)?.date).toBe(TODAY); // no future days
    expect(calendar.cells).toHaveLength(52 * 7 + 5); // Sun–Thu of this week
  });

  it("still shows 53 columns when today is a Sunday", () => {
    const calendar = buildCalendar(lastYearRange("2026-09-27"), new Map());
    expect(calendar.weeks).toBe(53);
    expect(calendar.cells.at(-1)?.date).toBe("2026-09-27");
  });

  it("pads a calendar year so 1 January sits on its weekday row", () => {
    const calendar = buildCalendar(yearRange(2025, TODAY), new Map());
    // 1 Jan 2025 was a Wednesday: three empty cells (Sun, Mon, Tue) come first.
    expect(calendar.cells.slice(0, 4).map((cell) => cell?.date ?? null)).toEqual([null, null, null, "2025-01-01"]);
    expect(calendar.cells.at(-1)?.date).toBe("2025-12-31");
  });

  it("cuts the current year off at today", () => {
    expect(yearRange(2026, TODAY)).toEqual({ start: "2026-01-01", end: TODAY });
  });

  it("shades by quartile of your active days, like GitHub", () => {
    expect(quartiles([0, 0, 1, 2, 3, 4, 5, 6, 7, 8])).toEqual([2, 4, 6]);
    expect([0, 1, 2, 3, 5, 7, 9].map((count) => levelFor(count, [2, 4, 6]))).toEqual([0, 1, 1, 2, 3, 4, 4]);
    expect(quartiles([0, 0])).toEqual([0, 0, 0]);
  });

  it("doesn't let one exceptional day wash out the rest", () => {
    const entries: Record<string, number> = { "2026-09-01": 40 };
    for (let d = 2; d <= 20; d++) entries[`2026-09-${String(d).padStart(2, "0")}`] = 1 + (d % 4);
    const calendar = buildCalendar(lastYearRange(TODAY), counts(entries));
    const levels = new Set(calendar.cells.filter((cell) => cell && cell.count > 0).map((cell) => cell!.level));
    expect([...levels].sort()).toEqual([1, 2, 3, 4]);
    expect(calendar.cells.find((cell) => cell?.date === "2026-09-01")?.level).toBe(4);
  });

  it("labels each month once, in order, ending with the current month", () => {
    const { months } = buildCalendar(lastYearRange(TODAY), new Map());
    expect(months.at(-1)?.label).toBe("Sep");
    expect(new Set(months.map((m) => m.column)).size).toBe(months.length);
    const { months: year } = buildCalendar(yearRange(2025, TODAY), new Map());
    expect(year.map((m) => m.label)).toEqual(["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]);
  });

  it("describes a day the way GitHub's tooltip does", () => {
    expect(describeDay({ date: "2026-09-27", count: 0, level: 0 })).toBe("No tasks done on September 27th.");
    expect(describeDay({ date: "2026-09-01", count: 1, level: 1 })).toBe("1 task done on September 1st.");
    expect(describeDay({ date: "2026-09-12", count: 3, level: 2 })).toBe("3 tasks done on September 12th.");
    expect(describeDay({ date: "2026-09-22", count: 5, level: 3 })).toBe("5 tasks done on September 22nd.");
  });
});

describe("summarize", () => {
  const since = "2026-09-01";

  it("counts a streak ending today", () => {
    const summary = summarize(TODAY, counts({ "2026-09-22": 1, "2026-09-23": 2, "2026-09-24": 1 }), since);
    expect(summary).toEqual({ current: 3, best: 3, activeDays: 3, completed: 4 });
  });

  it("keeps yesterday's streak alive while today is still open", () => {
    expect(summarize(TODAY, counts({ "2026-09-22": 1, "2026-09-23": 1 }), since).current).toBe(2);
  });

  it("breaks the streak after a missed day, but remembers the best run", () => {
    const summary = summarize(
      TODAY,
      counts({ "2026-09-10": 1, "2026-09-11": 1, "2026-09-12": 1, "2026-09-14": 1, "2026-09-22": 1 }),
      since,
    );
    expect(summary.current).toBe(0);
    expect(summary.best).toBe(3);
  });
});

describe("thisWeek", () => {
  it("returns Monday to Sunday", () => {
    const week = thisWeek(TODAY, counts({ "2026-09-21": 2 }));
    expect(week.map((d) => d.date)).toEqual([
      "2026-09-21", "2026-09-22", "2026-09-23", "2026-09-24", "2026-09-25", "2026-09-26", "2026-09-27",
    ]);
    expect(week[0].count).toBe(2);
  });
});

describe("strongestWeekday", () => {
  it("waits for enough history before claiming a pattern", () => {
    expect(strongestWeekday(counts({ "2026-09-22": 5 }))).toBeNull();
  });
  it("names the weekday with the most completions", () => {
    const entries: Record<string, number> = {};
    for (let day = 1; day <= 14; day++) entries[`2026-09-${String(day).padStart(2, "0")}`] = 1;
    entries["2026-09-08"] = 9; // a Tuesday
    expect(strongestWeekday(counts(entries))).toBe("Tuesday");
  });
});
