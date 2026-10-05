// Plain-text messages the bot sends. Pure functions only, so they are easy to test.

import { formatDay } from "@/lib/dates";
import { formatDayHeading, groupByDay } from "@/lib/day-words";
import { isCarriedOver, type Task } from "@/lib/task-rules";

const SHORT_DAY: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short" };

/** Tasks still to do, in list order. Their position here is their number in the bot. */
export function openTasks(tasks: Task[]): Task[] {
  return tasks.filter((task) => !task.done_at);
}

/** Tasks ticked off today, in list order. `/undo 2` refers to this numbering. */
export function doneTasks(tasks: Task[]): Task[] {
  return tasks.filter((task) => task.done_at);
}

/** A task line; `withFrom` adds "(from Sat 3 Oct)" when the list isn't already grouped by day. */
function describe(task: Task, day: string, withFrom = true): string {
  const from = withFrom && isCarriedOver(task, day) ? ` (from ${formatDay(task.task_date, SHORT_DAY)})` : "";
  const routine = task.routine_id ? " 🔁" : "";
  return `${task.title}${routine}${from}`;
}

/**
 * Today's list as the bot shows it: only what's left to do, grouped under the day
 * each task was planned for ("Sat, Oct 3rd", "Today · Mon, Oct 5th") and numbered
 * 1, 2, 3… straight across the groups. Finished tasks drop out and the rest renumber.
 */
export function formatList(day: string, tasks: Task[]): string {
  if (tasks.length === 0) return `${formatDayHeading(day, day)} — nothing on the list yet.`;

  const open = openTasks(tasks);
  const done = tasks.length - open.length;
  const lines = [`${done}/${tasks.length} done today`];
  if (open.length === 0) {
    lines.push("", "Everything’s done for today 🎉");
  } else {
    let number = 0;
    for (const group of groupByDay(open, (task) => task.task_date)) {
      lines.push("", formatDayHeading(group.day, day));
      for (const task of group.items) lines.push(`${++number}. ⬜ ${describe(task, day, false)}`);
    }
  }
  if (done > 0) {
    lines.push("", `✅ ${done} done today — send /undo to see ${done === 1 ? "it" : "them"}.`);
  }
  return lines.join("\n");
}

/** Reply to /upcoming: unfinished tasks for later days, grouped by day. */
export function formatUpcoming(today: string, tasks: Task[]): string {
  if (tasks.length === 0) {
    return "Nothing scheduled yet. Start a message with a day to plan ahead, e.g. “tomorrow: Call the bank”.";
  }
  const lines = ["Coming up:"];
  for (const group of groupByDay(tasks, (task) => task.task_date)) {
    lines.push("", formatDayHeading(group.day, today), ...group.items.map((task) => `• ${task.title}`));
  }
  return lines.join("\n");
}

/** Reply to a bare /undo: today's finished tasks, numbered for `/undo 2`. */
export function formatDoneList(day: string, tasks: Task[]): string {
  const done = doneTasks(tasks);
  if (done.length === 0) return "Nothing has been ticked off today yet.";
  return [
    "Done today:",
    "",
    ...done.map((task, index) => `${index + 1}. ✅ ${describe(task, day)}`),
    "",
    `Send /undo ${done.length === 1 ? "1" : "2"} to untick one.`,
  ].join("\n");
}

/** The 9am message: today's list, including anything carried over. */
export function formatMorningDigest(day: string, tasks: Task[]): string {
  const greeting = `Good morning ☀️ ${formatDay(day, { weekday: "long", day: "numeric", month: "long" })}`;
  if (tasks.length === 0) {
    return [greeting, "", "Nothing on today’s list yet. Send me a message to add a task."].join("\n");
  }

  const open = tasks.filter((task) => !task.done_at).length;
  const carried = tasks.filter((task) => !task.done_at && isCarriedOver(task, day)).length;
  const summary =
    `${open} task${open === 1 ? "" : "s"} for today` +
    (carried > 0 ? `, ${carried} carried over from earlier.` : ".");
  const lines = [greeting, summary, "", formatList(day, tasks)];
  if (open > 0) lines.push("", "Tap a number below to tick that task off.");
  return lines.join("\n");
}

// ── Tap buttons ──────────────────────────────────────────────────────────────

export type InlineKeyboard = { text: string; callback_data: string }[][];
export type ButtonAction = { action: "done" | "undo"; taskId: string };

/** Telegram allows up to 100 buttons in a message. */
const MAX_BUTTONS = 60;
/** Numbers per row: big enough to tap, compact enough for a long list. */
const BUTTONS_PER_ROW = 5;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * A compact grid of numbers, one per unfinished task, matching the numbered list
 * in the message text (which carries the titles). Tapping a number ticks that task
 * off; when the message refreshes it drops out and the rest renumber. No buttons
 * once everything is done. `callback_data` is "d:<id>" (≤ 64 bytes); "u:<id>"
 * (undo) is still accepted from older messages.
 */
export function taskButtons(tasks: Task[]): InlineKeyboard | undefined {
  const open = openTasks(tasks).slice(0, MAX_BUTTONS);
  if (open.length === 0) return undefined;
  const rows: InlineKeyboard = [];
  open.forEach((task, index) => {
    if (index % BUTTONS_PER_ROW === 0) rows.push([]);
    rows[rows.length - 1].push({ text: String(index + 1), callback_data: `d:${task.id}` });
  });
  return rows;
}

/** Reads a button's callback_data; anything unexpected is rejected. */
export function parseButton(data: string | undefined): ButtonAction | null {
  const match = data?.match(/^([du]):(.+)$/);
  if (!match || !UUID.test(match[2])) return null;
  return { action: match[1] === "d" ? "done" : "undo", taskId: match[2] };
}
