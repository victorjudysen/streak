import { describe, expect, it } from "vitest";
import { addDays, localDate } from "@/lib/dates";
import { decideComplete, decideRemove, decideUndo, isOnList, sortTasks, validateTitle, type Task } from "@/lib/task-rules";

const ZONE = "Africa/Dar_es_Salaam"; // UTC+3
const TODAY = "2026-09-24";

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: "t1",
    seq: 1,
    title: "Call the bank",
    task_date: TODAY,
    done_at: null,
    dropped_at: null,
    source: "app",
    created_at: "2026-09-24T06:00:00Z",
    ...overrides,
  };
}

describe("dates", () => {
  it("uses the configured zone, not UTC, to decide the day", () => {
    // 22:30 UTC on the 23rd is already 01:30 on the 24th in Dar es Salaam.
    expect(localDate("2026-09-23T22:30:00Z", ZONE)).toBe("2026-09-24");
    expect(localDate("2026-09-23T20:30:00Z", ZONE)).toBe("2026-09-23");
  });

  it("adds days across month boundaries", () => {
    expect(addDays("2026-09-30", 1)).toBe("2026-10-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });
});

describe("validateTitle", () => {
  it("trims and collapses whitespace", () => {
    expect(validateTitle("  buy   milk \n")).toEqual({ title: "buy milk" });
  });
  it("rejects empty and overly long titles", () => {
    expect(validateTitle("   ")).toHaveProperty("error");
    expect(validateTitle("x".repeat(281))).toHaveProperty("error");
  });
});

describe("isOnList", () => {
  it("shows today's tasks, done or not", () => {
    expect(isOnList(task(), TODAY, ZONE)).toBe(true);
    expect(isOnList(task({ done_at: "2026-09-24T09:00:00Z" }), TODAY, ZONE)).toBe(true);
  });
  it("carries unfinished tasks over from earlier days", () => {
    expect(isOnList(task({ task_date: "2026-09-20" }), TODAY, ZONE)).toBe(true);
  });
  it("keeps a carried-over task visible on the day it was completed, then drops it", () => {
    const doneToday = task({ task_date: "2026-09-20", done_at: "2026-09-24T09:00:00Z" });
    const doneEarlier = task({ task_date: "2026-09-20", done_at: "2026-09-22T09:00:00Z" });
    expect(isOnList(doneToday, TODAY, ZONE)).toBe(true);
    expect(isOnList(doneEarlier, TODAY, ZONE)).toBe(false);
  });
  it("hides tasks that were let go", () => {
    expect(isOnList(task({ task_date: "2026-09-20", dropped_at: "2026-09-24T09:00:00Z" }), TODAY, ZONE)).toBe(false);
  });
});

describe("closed days stay closed", () => {
  it("allows undoing a completion made today", () => {
    expect(decideUndo(task({ done_at: "2026-09-24T09:00:00Z" }), TODAY, ZONE)).toEqual({ action: "undo" });
  });
  it("refuses to undo a completion made on an earlier day", () => {
    expect(decideUndo(task({ task_date: "2026-09-23", done_at: "2026-09-23T09:00:00Z" }), TODAY, ZONE)).toHaveProperty("error");
  });
  it("deletes today's tasks but only lets go of older unfinished ones", () => {
    expect(decideRemove(task(), TODAY, ZONE)).toEqual({ action: "delete" });
    expect(decideRemove(task({ task_date: "2026-09-21" }), TODAY, ZONE)).toEqual({ action: "drop" });
  });
  it("never removes a completion recorded on a closed day", () => {
    expect(decideRemove(task({ task_date: "2026-09-21", done_at: "2026-09-22T09:00:00Z" }), TODAY, ZONE)).toHaveProperty("error");
  });
  it("does not complete a task twice", () => {
    expect(decideComplete(task({ done_at: "2026-09-24T09:00:00Z" }))).toHaveProperty("error");
    expect(decideComplete(task())).toEqual({ action: "complete" });
  });
});

describe("sortTasks", () => {
  it("puts older carried-over tasks first, then keeps insertion order", () => {
    // Tasks added in one message share a created_at; seq keeps their order fixed.
    const sorted = sortTasks([
      task({ id: "b", seq: 12 }),
      task({ id: "old", seq: 30, task_date: "2026-09-20" }),
      task({ id: "a", seq: 11 }),
    ]);
    expect(sorted.map((t) => t.id)).toEqual(["old", "a", "b"]);
  });
});
