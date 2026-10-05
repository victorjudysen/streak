import { describe, expect, it } from "vitest";
import { checkScheduleDay, describeScheduleDay, parseDayWord, splitDatePrefix } from "@/lib/day-words";

const TODAY = "2026-10-05"; // a Monday

describe("parseDayWord", () => {
  it("understands today and tomorrow", () => {
    expect(parseDayWord("today", TODAY)).toBe(TODAY);
    expect(parseDayWord("Tomorrow", TODAY)).toBe("2026-10-06");
    expect(parseDayWord("tmrw", TODAY)).toBe("2026-10-06");
  });

  it("reads weekday names as the next such day", () => {
    expect(parseDayWord("fri", TODAY)).toBe("2026-10-09");
    expect(parseDayWord("Friday", TODAY)).toBe("2026-10-09");
    expect(parseDayWord("next friday", TODAY)).toBe("2026-10-09");
    expect(parseDayWord("sun", TODAY)).toBe("2026-10-11");
    expect(parseDayWord("mon", TODAY)).toBe("2026-10-12"); // today is Monday → next week
  });

  it("reads dates with and without a year", () => {
    expect(parseDayWord("2026-10-12", TODAY)).toBe("2026-10-12");
    expect(parseDayWord("12 oct", TODAY)).toBe("2026-10-12");
    expect(parseDayWord("12th October", TODAY)).toBe("2026-10-12");
    expect(parseDayWord("oct 12", TODAY)).toBe("2026-10-12");
    expect(parseDayWord("3 jan", TODAY)).toBe("2027-01-03"); // already passed this year
    expect(parseDayWord("5 oct", TODAY)).toBe(TODAY);
    expect(parseDayWord("12 oct 2027", TODAY)).toBe("2027-10-12");
  });

  it("returns null for anything else", () => {
    expect(parseDayWord("note", TODAY)).toBeNull();
    expect(parseDayWord("31 feb", TODAY)).toBeNull();
    expect(parseDayWord("2026-02-30", TODAY)).toBeNull();
    expect(parseDayWord("", TODAY)).toBeNull();
  });
});

describe("splitDatePrefix", () => {
  it("takes a day before a colon", () => {
    expect(splitDatePrefix("tomorrow: Call the bank", TODAY)).toEqual({ day: "2026-10-06", title: "Call the bank" });
    expect(splitDatePrefix("12 oct:Dentist", TODAY)).toEqual({ day: "2026-10-12", title: "Dentist" });
  });

  it("leaves other colons alone", () => {
    expect(splitDatePrefix("Note: buy milk", TODAY)).toEqual({ day: null, title: "Note: buy milk" });
    expect(splitDatePrefix("Monday meeting notes", TODAY)).toEqual({ day: null, title: "Monday meeting notes" });
    expect(splitDatePrefix("Reply to: John, re 12 oct", TODAY)).toEqual({ day: null, title: "Reply to: John, re 12 oct" });
  });
});

describe("checkScheduleDay", () => {
  it("allows today up to a year ahead, never the past", () => {
    expect(checkScheduleDay(TODAY, TODAY)).toEqual({ day: TODAY });
    expect(checkScheduleDay("2027-10-05", TODAY)).toEqual({ day: "2027-10-05" });
    expect(checkScheduleDay("2027-10-06", TODAY)).toHaveProperty("error");
    expect(checkScheduleDay("2026-10-04", TODAY)).toHaveProperty("error");
  });
});

describe("describeScheduleDay", () => {
  it("names nearby days and adds the year when it differs", () => {
    expect(describeScheduleDay(TODAY, TODAY)).toBe("Today");
    expect(describeScheduleDay("2026-10-06", TODAY)).toBe("Tomorrow");
    expect(describeScheduleDay("2026-10-09", TODAY)).toBe("Fri 9 Oct");
    expect(describeScheduleDay("2027-01-03", TODAY)).toBe("Sun 3 Jan 2027");
  });
});
