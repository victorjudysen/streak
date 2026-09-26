import { describe, expect, it } from "vitest";
import { describeWeekdays, isActive, isScheduledOn, isoWeekday, parseWeekdays, routineStreak } from "@/lib/routine-rules";

const TODAY = "2026-09-26"; // a Saturday
const SINCE = "2026-01-01";
const EVERY_DAY = { weekdays: [1, 2, 3, 4, 5, 6, 7] };
const MON_WED_FRI = { weekdays: [1, 3, 5] };

describe("schedules", () => {
  it("uses ISO weekdays, Monday = 1", () => {
    expect(isoWeekday("2026-09-21")).toBe(1); // Monday
    expect(isoWeekday(TODAY)).toBe(6);
    expect(isoWeekday("2026-09-27")).toBe(7); // Sunday
  });

  it("knows which days a routine is due", () => {
    expect(isScheduledOn(MON_WED_FRI, "2026-09-25")).toBe(true); // Friday
    expect(isScheduledOn(MON_WED_FRI, TODAY)).toBe(false);
  });

  it("treats paused and removed routines as inactive", () => {
    expect(isActive({ paused_at: null, archived_at: null })).toBe(true);
    expect(isActive({ paused_at: "2026-09-20T00:00:00Z", archived_at: null })).toBe(false);
    expect(isActive({ paused_at: null, archived_at: "2026-09-20T00:00:00Z" })).toBe(false);
  });
});

describe("parseWeekdays", () => {
  it("keeps valid days once, in order", () => {
    expect(parseWeekdays(["5", "1", "5", "9", "x"])).toEqual([1, 5]);
  });
  it("requires at least one day", () => {
    expect(parseWeekdays([])).toEqual({ error: "Pick at least one day." });
  });
});

describe("describeWeekdays", () => {
  it("names common schedules", () => {
    expect(describeWeekdays([1, 2, 3, 4, 5, 6, 7])).toBe("Every day");
    expect(describeWeekdays([1, 2, 3, 4, 5])).toBe("Weekdays");
    expect(describeWeekdays([6, 7])).toBe("Weekends");
    expect(describeWeekdays([1, 3, 5])).toBe("Mon, Wed, Fri");
  });
});

describe("routineStreak", () => {
  it("counts completed days in a row, ending today", () => {
    const done = new Set(["2026-09-24", "2026-09-25", TODAY]);
    expect(routineStreak(EVERY_DAY, done, TODAY, SINCE)).toBe(3);
  });

  it("doesn't break the streak because today isn't done yet", () => {
    const done = new Set(["2026-09-24", "2026-09-25"]);
    expect(routineStreak(EVERY_DAY, done, TODAY, SINCE)).toBe(2);
  });

  it("breaks on a missed scheduled day", () => {
    const done = new Set(["2026-09-23", "2026-09-25"]); // missed Thursday
    expect(routineStreak(EVERY_DAY, done, TODAY, SINCE)).toBe(1);
  });

  it("only counts the days the routine is scheduled for", () => {
    // Mon 21, Wed 23, Fri 25 done; Tue/Thu/Sat aren't scheduled, so they don't break it.
    const done = new Set(["2026-09-21", "2026-09-23", "2026-09-25"]);
    expect(routineStreak(MON_WED_FRI, done, TODAY, SINCE)).toBe(3);
  });

  it("is zero with no history", () => {
    expect(routineStreak(EVERY_DAY, new Set(), TODAY, SINCE)).toBe(0);
  });
});
