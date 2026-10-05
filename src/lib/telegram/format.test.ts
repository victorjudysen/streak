import { describe, expect, it } from "vitest";
import type { Task } from "@/lib/task-rules";
import { formatDoneList, formatList, formatMorningDigest, parseButton, taskButtons } from "@/lib/telegram/format";

const TODAY = "2026-09-26"; // a Saturday

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: "t1",
    seq: 1,
    title: "Call the bank",
    task_date: TODAY,
    done_at: null,
    dropped_at: null,
    source: "app",
    created_at: "2026-09-26T06:00:00Z",
    routine_id: null,
    ...overrides,
  };
}

describe("formatList", () => {
  it("lists only what's left, grouped by day and numbered across the groups", () => {
    const text = formatList(TODAY, [
      task({ id: "a", title: "Renew passport", task_date: "2026-09-24" }),
      task({ id: "b", title: "Gym", done_at: "2026-09-26T05:00:00Z" }),
      task({ id: "c", title: "Buy milk" }),
    ]);
    expect(text.startsWith("1/3 done today")).toBe(true);
    expect(text).toContain("Thu, Sep 24th\n1. ⬜ Renew passport\n");
    expect(text).toContain("Today · Sat, Sep 26th\n2. ⬜ Buy milk");
    expect(text).not.toContain("(from");
    expect(text).not.toContain("Gym");
    expect(text).toContain("✅ 1 done today — send /undo to see it.");
  });

  it("celebrates when everything is done", () => {
    const text = formatList(TODAY, [task({ done_at: "2026-09-26T05:00:00Z" }), task({ id: "b", done_at: "2026-09-26T06:00:00Z" })]);
    expect(text).toContain("2/2 done");
    expect(text).toContain("Everything’s done for today 🎉");
    expect(text).toContain("✅ 2 done today — send /undo to see them.");
  });

  it("has no done line when nothing is done yet", () => {
    expect(formatList(TODAY, [task()])).not.toContain("✅");
  });
});

describe("formatDoneList", () => {
  it("numbers today's finished tasks for /undo", () => {
    const text = formatDoneList(TODAY, [
      task({ id: "a", title: "Buy milk" }),
      task({ id: "b", title: "Gym", done_at: "2026-09-26T05:00:00Z" }),
      task({ id: "c", title: "Call the bank", done_at: "2026-09-26T06:00:00Z" }),
    ]);
    expect(text).toContain("1. ✅ Gym");
    expect(text).toContain("2. ✅ Call the bank");
    expect(text).not.toContain("Buy milk");
    expect(text).toContain("Send /undo 2 to untick one.");
  });

  it("says so when nothing is done yet", () => {
    expect(formatDoneList(TODAY, [task()])).toBe("Nothing has been ticked off today yet.");
  });
});

describe("routine tasks", () => {
  it("marks routine tasks with 🔁", () => {
    expect(formatList(TODAY, [task({ title: "Morning prayers", routine_id: "r1" })])).toContain(
      "1. ⬜ Morning prayers 🔁",
    );
  });
});

describe("formatMorningDigest", () => {
  it("greets with the date and counts what is left, including carry-overs", () => {
    const text = formatMorningDigest(TODAY, [
      task({ id: "a", title: "Renew passport", task_date: "2026-09-24" }),
      task({ id: "b", title: "Buy milk" }),
    ]);
    expect(text.startsWith("Good morning ☀️ Saturday 26 September")).toBe(true);
    expect(text).toContain("2 tasks for today, 1 carried over from earlier.");
    expect(text).toContain("1. ⬜ Renew passport");
    expect(text).toContain("Tap a number below to tick that task off.");
  });

  it("only invites tapping when something is left to do", () => {
    const text = formatMorningDigest(TODAY, [task({ done_at: "2026-09-26T05:00:00Z" })]);
    expect(text).toContain("0 tasks for today.");
    expect(text).not.toContain("Tap a task");
  });

  it("uses the singular for one task", () => {
    expect(formatMorningDigest(TODAY, [task()])).toContain("1 task for today.");
  });

  it("invites adding a task when the list is empty", () => {
    const text = formatMorningDigest(TODAY, []);
    expect(text).toContain("Nothing on today’s list yet.");
    expect(text).not.toContain("Tap a task");
  });
});

const ID_A = "0b2e7c1e-5d0a-4a57-9a8e-2f0d1c3b4a5f";
const ID_B = "7f3c2a10-9b8e-4c6d-8e1f-0a2b3c4d5e6f";

describe("taskButtons", () => {
  it("only has number buttons for unfinished tasks, numbered like the list", () => {
    const keyboard = taskButtons([
      task({ id: ID_B, title: "Gym", done_at: "2026-09-26T05:00:00Z" }),
      task({ id: ID_A, title: "Buy milk" }),
    ]);
    expect(keyboard).toEqual([[{ text: "1", callback_data: `d:${ID_A}` }]]);
  });

  it("lays numbers out five to a row", () => {
    const tasks = Array.from({ length: 14 }, (_, i) =>
      task({ id: `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`, seq: i + 1 }),
    );
    const keyboard = taskButtons(tasks)!;
    expect(keyboard.map((row) => row.map((button) => button.text))).toEqual([
      ["1", "2", "3", "4", "5"],
      ["6", "7", "8", "9", "10"],
      ["11", "12", "13", "14"],
    ]);
    expect(keyboard[2][3].callback_data).toBe(`d:${tasks[13].id}`);
  });

  it("has no buttons once everything is done", () => {
    expect(taskButtons([task({ id: ID_A, done_at: "2026-09-26T05:00:00Z" })])).toBeUndefined();
  });

  it("keeps callback data within Telegram's 64-byte limit, whatever the title", () => {
    const [[button]] = taskButtons([task({ id: ID_A, title: "x".repeat(200) })])!;
    expect(new TextEncoder().encode(button.callback_data).length).toBeLessThanOrEqual(64);
    expect(button.text).toBe("1");
  });

  it("has no keyboard for an empty list", () => {
    expect(taskButtons([])).toBeUndefined();
  });
});

describe("parseButton", () => {
  it("reads done and undo taps", () => {
    expect(parseButton(`d:${ID_A}`)).toEqual({ action: "done", taskId: ID_A });
    expect(parseButton(`u:${ID_A}`)).toEqual({ action: "undo", taskId: ID_A });
  });

  it("rejects anything else", () => {
    expect(parseButton(undefined)).toBeNull();
    expect(parseButton("x:" + ID_A)).toBeNull();
    expect(parseButton("d:not-a-uuid")).toBeNull();
    expect(parseButton("d:" + ID_A + "; drop table")).toBeNull();
  });
});
