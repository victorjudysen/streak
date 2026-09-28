// Plain-text messages the bot sends. Pure functions only, so they are easy to test.

import { formatDay } from "@/lib/dates";
import { isCarriedOver, type Task } from "@/lib/task-rules";

const SHORT_DAY: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short" };

export function formatList(day: string, tasks: Task[]): string {
  const heading = formatDay(day, SHORT_DAY);
  if (tasks.length === 0) return `${heading} — nothing on the list yet.`;

  const done = tasks.filter((task) => task.done_at).length;
  const lines = tasks.map((task, index) => {
    const mark = task.done_at ? "✅" : "⬜";
    const from = isCarriedOver(task, day) ? ` (from ${formatDay(task.task_date, SHORT_DAY)})` : "";
    const routine = task.routine_id ? " 🔁" : "";
    return `${index + 1}. ${mark} ${task.title}${routine}${from}`;
  });
  return [`${heading} — ${done}/${tasks.length} done`, "", ...lines].join("\n");
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
 * One button per unfinished task: tapping it ticks the task off, and it drops out
 * of the buttons when the message refreshes. Buttons keep the task's number from
 * the full list above them, so `/done 3` and `/undo 7` still match. No buttons
 * once everything is done. `callback_data` is "d:<id>" (≤ 64 bytes); "u:<id>"
 * (undo) is still accepted from older messages.
 */
export function taskButtons(tasks: Task[]): InlineKeyboard | undefined {
  const open = tasks
    .map((task, index) => ({ task, number: index + 1 }))
    .filter(({ task }) => !task.done_at)
    .slice(0, MAX_BUTTONS);
  if (open.length === 0) return undefined;
  return open.map(({ task, number }) => [
    { text: `⬜ ${number}. ${shorten(task.title)}`, callback_data: `d:${task.id}` },
  ]);
}

/** Reads a button's callback_data; anything unexpected is rejected. */
export function parseButton(data: string | undefined): ButtonAction | null {
  const match = data?.match(/^([du]):(.+)$/);
  if (!match || !UUID.test(match[2])) return null;
  return { action: match[1] === "d" ? "done" : "undo", taskId: match[2] };
}
