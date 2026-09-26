import { describe, expect, it } from "vitest";
import type { Task } from "@/lib/task-rules";
import { formatList, formatMorningDigest } from "@/lib/telegram/format";

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

describe("formatMorningDigest", () => {
  it("greets with the date and counts what is left, including carry-overs", () => {
    const text = formatMorningDigest(TODAY, [
      task({ id: "a", title: "Renew passport", task_date: "2026-09-24" }),
      task({ id: "b", title: "Buy milk" }),
    ]);
    expect(text.startsWith("Good morning ☀️ Saturday 26 September")).toBe(true);
    expect(text).toContain("2 tasks for today, 1 carried over from earlier.");
    expect(text).toContain("1. ⬜ Renew passport");
    expect(text).toContain("Reply /done 2 to tick one off.");
  });

  it("uses the singular for one task", () => {
    expect(formatMorningDigest(TODAY, [task()])).toContain("1 task for today.");
  });

  it("invites adding a task when the list is empty", () => {
    const text = formatMorningDigest(TODAY, []);
    expect(text).toContain("Nothing on today’s list yet.");
    expect(text).not.toContain("/done");
  });
});
