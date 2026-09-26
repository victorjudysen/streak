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
    return `${index + 1}. ${mark} ${task.title}${from}`;
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
  return [greeting, summary, "", formatList(day, tasks), "", "Reply /done 2 to tick one off."].join("\n");
}
