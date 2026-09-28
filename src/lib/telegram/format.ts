// Plain-text messages the bot sends. Pure functions only, so they are easy to test.

import { formatDay } from "@/lib/dates";
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

function describe(task: Task, day: string): string {
  const from = isCarriedOver(task, day) ? ` (from ${formatDay(task.task_date, SHORT_DAY)})` : "";
  const routine = task.routine_id ? " 🔁" : "";
  return `${task.title}${routine}${from}`;
}

/**
 * Today's list as the bot shows it: only what's left to do, numbered 1, 2, 3…
 * Finished tasks drop out (and the rest renumber); the heading keeps the progress.
 */
export function formatList(day: string, tasks: Task[]): string {
  const heading = formatDay(day, SHORT_DAY);
  if (tasks.length === 0) return `${heading} — nothing on the list yet.`;

  const open = openTasks(tasks);
  const done = tasks.length - open.length;
  const lines = [`${heading} — ${done}/${tasks.length} done`, ""];
  if (open.length === 0) {
    lines.push("Everything’s done for today 🎉");
  } else {
    lines.push(...open.map((task, index) => `${index + 1}. ⬜ ${describe(task, day)}`));
  }
  if (done > 0) {
    lines.push("", `✅ ${done} done today — send /undo to see ${done === 1 ? "it" : "them"}.`);
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
  if (open > 0) lines.push("", "Tap a task below to tick it off.");
  return lines.join("\n");
}

// ── Tap buttons ──────────────────────────────────────────────────────────────

export type InlineKeyboard = { text: string; callback_data: string }[][];
export type ButtonAction = { action: "done" | "undo"; taskId: string };

/** Telegram allows up to 100 buttons; a daily list never needs more than this. */
const MAX_BUTTONS = 30;
const MAX_LABEL = 40;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function shorten(title: string): string {
  return title.length > MAX_LABEL ? `${title.slice(0, MAX_LABEL - 1)}…` : title;
}

/**
 * One button per unfinished task, numbered like the list above it. Tapping one
 * ticks the task off; when the message refreshes it drops out and the rest
 * renumber. No buttons once everything is done. `callback_data` is "d:<id>" (≤ 64 bytes); "u:<id>"
 * (undo) is still accepted from older messages.
 */
export function taskButtons(tasks: Task[]): InlineKeyboard | undefined {
  const open = openTasks(tasks).slice(0, MAX_BUTTONS);
  if (open.length === 0) return undefined;
  return open.map((task, index) => [
    { text: `⬜ ${index + 1}. ${shorten(task.title)}`, callback_data: `d:${task.id}` },
  ]);
}

/** Reads a button's callback_data; anything unexpected is rejected. */
export function parseButton(data: string | undefined): ButtonAction | null {
  const match = data?.match(/^([du]):(.+)$/);
  if (!match || !UUID.test(match[2])) return null;
  return { action: match[1] === "d" ? "done" : "undo", taskId: match[2] };
}
