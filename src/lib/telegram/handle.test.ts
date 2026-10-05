import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Task } from "@/lib/task-rules";

// Runs whole bot conversations against an in-memory task list, to check that the
// numbers in commands always match the list the bot last showed.

vi.mock("server-only", () => ({}));
// Pin "today" so scheduled days are predictable.
vi.mock("@/lib/dates", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/dates")>()),
  today: () => "2026-09-28",
}));

const DAY = "2026-09-28";
let store: Task[] = [];

function make(title: string, done = false, day = DAY): Task {
  const seq = store.length + 1;
  return {
    id: `00000000-0000-4000-8000-${String(seq).padStart(12, "0")}`,
    seq,
    title,
    task_date: day,
    done_at: done ? "2026-09-28T06:00:00Z" : null,
    dropped_at: null,
    source: "telegram",
    created_at: "2026-09-28T05:00:00Z",
    routine_id: null,
  };
}

const found = (id: string) => store.find((task) => task.id === id);

vi.mock("@/lib/tasks", () => ({
  listForToday: async () => ({ day: DAY, tasks: store.filter((task) => !task.dropped_at && task.task_date <= DAY) }),
  listUpcoming: async () => store.filter((task) => task.task_date > DAY && !task.done_at && !task.dropped_at),
  addTasks: async (items: { title: string; day?: string | null }[]) => {
    const added: Task[] = [];
    for (const item of items) {
      const task = make(item.title, false, item.day ?? DAY);
      store.push(task);
      added.push(task);
    }
    return { ok: true, task: added };
  },
  completeTask: async (id: string) => {
    const task = found(id);
    if (!task) return { ok: false, error: "That task no longer exists." };
    if (task.done_at) return { ok: false, error: "Already done." };
    task.done_at = "2026-09-28T09:00:00Z";
    return { ok: true, task };
  },
  undoTask: async (id: string) => {
    const task = found(id);
    if (!task?.done_at) return { ok: false, error: "It isn’t marked done." };
    task.done_at = null;
    return { ok: true, task };
  },
  removeTask: async (id: string) => {
    const task = found(id);
    if (!task) return { ok: false, error: "That task no longer exists." };
    store = store.filter((t) => t.id !== id);
    return { ok: true, task: { ...task, removal: "delete" } };
  },
}));

const { handleButton, handleMessage } = await import("@/lib/telegram/handle");

beforeEach(() => {
  store = [];
  // One at a time: make() numbers each task from the store's current length.
  for (const [title, done] of [["Work on the idea", false], ["Finish docs", true], ["Walkthrough doc", false], ["Announcements", false]] as const) {
    store.push(make(title, done));
  }
  expect(new Set(store.map((task) => task.id)).size).toBe(4);
});

describe("numbering follows what's left on the list", () => {
  it("/list shows only unfinished tasks, numbered from 1", async () => {
    const { text, tasks } = await handleMessage("/list");
    expect(text).toContain("1/4 done");
    expect(text).toContain("1. ⬜ Work on the idea");
    expect(text).toContain("2. ⬜ Walkthrough doc");
    expect(text).toContain("3. ⬜ Announcements");
    expect(text).not.toContain("Finish docs");
    expect(tasks).toHaveLength(4); // the full list goes to the buttons, which skip done tasks
  });

  it("/done 2 ticks off the 2nd task still on the list, then the rest renumber", async () => {
    const { text } = await handleMessage("/done 2");
    expect(text).toContain("Done: Walkthrough doc");
    expect(text).toContain("1. ⬜ Work on the idea");
    expect(text).toContain("2. ⬜ Announcements");
  });

  it("/done 1 3 uses the numbers as they were when the command was sent", async () => {
    const { text } = await handleMessage("/done 1 3");
    expect(text).toContain("Done: Work on the idea");
    expect(text).toContain("Done: Announcements");
    expect(text).toContain("1. ⬜ Walkthrough doc");
  });

  it("/done all ticks off everything left", async () => {
    const { text } = await handleMessage("/done all");
    expect(text).toContain("4/4 done");
    expect(text).toContain("Everything’s done for today 🎉");
  });

  it("/remove 1 removes the 1st task still on the list", async () => {
    const { text } = await handleMessage("/remove 1");
    expect(text).toContain("Removed: Work on the idea");
    expect(found(store[0].id)?.title).toBe("Finish docs");
  });

  it("a number past the end of the list says so", async () => {
    const { text } = await handleMessage("/done 4");
    expect(text).toContain("#4: there is no task with that number.");
  });
});

describe("undo", () => {
  it("/undo lists today's finished tasks with their own numbers", async () => {
    await handleMessage("/done 1");
    const { text } = await handleMessage("/undo");
    expect(text).toContain("Done today:");
    expect(text).toContain("1. ✅ Work on the idea");
    expect(text).toContain("2. ✅ Finish docs");
  });

  it("/undo 1 unticks the 1st finished task, which returns to the list", async () => {
    const { text } = await handleMessage("/undo 1");
    expect(text).toContain("Undone: Finish docs");
    expect(text).toContain("0/4 done");
    expect(text).toContain("2. ⬜ Finish docs");
  });
});

describe("buttons", () => {
  it("a tap ticks the task off and the refreshed list drops it", async () => {
    const target = store.find((task) => task.title === "Walkthrough doc")!;
    const { notice, text } = await handleButton(`d:${target.id}`);
    expect(notice).toBe("Done: Walkthrough doc");
    expect(text).not.toContain("Walkthrough doc");
    expect(text).toContain("2. ⬜ Announcements");
  });
});

describe("scheduling ahead", () => {
  it("a day before a colon schedules the task; it stays off today's list", async () => {
    const { text } = await handleMessage("tomorrow: Call the bank");
    expect(text).toContain("Scheduled for Tomorrow: Call the bank");
    expect(text).not.toContain("⬜ Call the bank");
    expect(store.find((task) => task.title === "Call the bank")?.task_date).toBe("2026-09-29");
  });

  it("works per line, with /add too, and leaves other colons alone", async () => {
    const { text } = await handleMessage("/add fri: Gym\nNote: buy milk");
    expect(text).toContain("Scheduled for Fri 2 Oct: Gym");
    expect(text).toContain("Added: Note: buy milk");
  });

  it("/upcoming lists what's scheduled, grouped by day", async () => {
    await handleMessage("tomorrow: Call the bank\n12 oct: Dentist");
    const { text } = await handleMessage("/upcoming");
    expect(text).toContain("Tomorrow\n• Call the bank");
    expect(text).toContain("Mon 12 Oct\n• Dentist");
  });

  it("/upcoming says how to plan ahead when nothing is scheduled", async () => {
    const { text } = await handleMessage("/upcoming");
    expect(text).toContain("Nothing scheduled yet");
  });
});
