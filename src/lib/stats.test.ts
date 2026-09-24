import { describe, expect, it } from "vitest";
import { MAP_WEEKS, buildMap, levelFor, mapStart, monthLabels, strongestWeekday, summarize, thisWeek } from "@/lib/stats";

const TODAY = "2026-09-24"; // a Thursday

const counts = (entries: Record<string, number>) => new Map(Object.entries(entries));

describe("activity map", () => {
  it("starts on a Monday and covers 53 whole weeks ending this week", () => {
    const start = mapStart(TODAY);
    expect(new Date(`${start}T00:00:00Z`).getUTCDay()).toBe(1);
    const days = buildMap(TODAY, new Map());
    expect(days).toHaveLength(MAP_WEEKS * 7);
    expect(days.at(-1)?.date).toBe("2026-09-27"); // Sunday of this week
    expect(days.filter((day) => day.isToday)).toHaveLength(1);
    expect(days.filter((day) => day.isFuture)).toHaveLength(3);
  });

  it("maps counts to intensity levels", () => {
    expect([0, 1, 2, 3, 4, 5, 6, 20].map(levelFor)).toEqual([0, 1, 2, 2, 3, 3, 4, 4]);
  });

  it("labels each month once, in order", () => {
    const labels = monthLabels(buildMap(TODAY, new Map()));
    expect(labels.at(-1)?.label).toBe("Sep");
    expect(new Set(labels.map((l) => l.column)).size).toBe(labels.length);
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
