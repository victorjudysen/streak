import { describe, expect, it } from "vitest";
import type { Task } from "@/lib/task-rules";
import { formatList, formatMorningDigest, parseButton, taskButtons } from "@/lib/telegram/format";

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
  it("numbers tasks, marks done ones, and labels carried-over tasks", () => {
    const text = formatList(TODAY, [
      task({ id: "a", title: "Renew passport", task_date: "2026-09-24" }),
      task({ id: "b", title: "Gym", done_at: "2026-09-26T05:00:00Z" }),
    ]);
    expect(text).toContain("Sat 26 Sept — 1/2 done");
    expect(text).toContain("1. ⬜ Renew passport (from Thu 24 Sept)");
    expect(text).toContain("2. ✅ Gym");
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
    expect(text).toContain("Tap a task below to tick it off.");
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
  it("gives each task a numbered button: ⬜ to tick off, ✅ to untick", () => {
    const keyboard = taskButtons([
      task({ id: ID_A, title: "Buy milk" }),
      task({ id: ID_B, title: "Gym", done_at: "2026-09-26T05:00:00Z" }),
    ]);
    expect(keyboard).toEqual([
      [{ text: "⬜ 1. Buy milk", callback_data: `d:${ID_A}` }],
      [{ text: "✅ 2. Gym", callback_data: `u:${ID_B}` }],
    ]);
  });

  it("keeps callback data within Telegram's 64-byte limit and shortens long titles", () => {
    const [[button]] = taskButtons([task({ id: ID_A, title: "x".repeat(200) })])!;
    expect(new TextEncoder().encode(button.callback_data).length).toBeLessThanOrEqual(64);
    expect(button.text.length).toBeLessThan(60);
    expect(button.text.endsWith("…")).toBe(true);
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
