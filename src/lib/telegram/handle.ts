import "server-only";

import type { Task } from "@/lib/task-rules";
import { today } from "@/lib/dates";
import { describeScheduleDay, parseDayWord, splitDatePrefix } from "@/lib/day-words";
import { addTasks, completeTask, editTask, listForToday, listUpcoming, removeTask, undoTask } from "@/lib/tasks";
import { parseCommand } from "@/lib/telegram/commands";
import { doneTasks, formatDoneList, formatList, formatUpcoming, openTasks, parseButton } from "@/lib/telegram/format";

export const HELP_TEXT = [
  "Streak bot — your daily list.",
  "",
  "Just send a message to add it as a task (one task per line).",
  "",
  "/list — what’s left today, numbered (or tap a task’s button)",
  "/done 2 — tick off task 2 (also /done 1 3, /done 2-4, /done all)",
  "/remove 2 — remove task 2",
  "/undo — see what you’ve ticked off today; /undo 2 unticks the 2nd",
  "",
  "Plan ahead by starting with a day: “tomorrow: Call the bank”, “fri: Gym”, “12 oct: Dentist”.",
  "/upcoming — what’s scheduled for later days",
  "/edit 2 New title — rename task 2",
  "/move 2 tomorrow — move task 2 to another day",
  "/help — show this message",
].join("\n");

type Change = (id: string) => Promise<{ ok: true; task: Task } | { ok: false; error: string }>;

/** Applies a change to each numbered task and describes exactly what happened. */
async function applyByNumber(
  targets: number[],
  tasks: Task[],
  change: Change,
  describe: (task: Task) => string,
): Promise<string[]> {
  const lines: string[] = [];
  for (const number of targets) {
    const task = tasks[number - 1];
    if (!task) {
      lines.push(`#${number}: there is no task with that number.`);
      continue;
    }
    const result = await change(task.id);
    lines.push(result.ok ? describe(result.task) : `#${number} “${task.title}”: ${result.error}`);
  }
  return lines;
}

/** A reply's text, plus the list it shows (if any) so tap buttons can be attached. */
export interface BotReply {
  text: string;
  tasks?: Task[];
}

/** Runs one message and returns the reply. */
export async function handleMessage(text: string): Promise<BotReply> {
  const command = parseCommand(text);

  switch (command.kind) {
    case "help":
      return { text: HELP_TEXT };
    case "invalid":
      return { text: command.message };
    case "list": {
      const { day, tasks } = await listForToday();
      return { text: formatList(day, tasks), tasks };
    }
    case "add": {
      // "tomorrow: Call the bank" schedules a line for another day.
      const now = today();
      const result = await addTasks(command.titles.map((line) => splitDatePrefix(line, now)), "telegram");
      if (!result.ok) return { text: `Nothing was added. ${result.error}` };
      const { day, tasks } = await listForToday();
      const added = result.task.map((task) =>
        task.task_date === day ? `Added: ${task.title}` : `Scheduled for ${describeScheduleDay(task.task_date, day)}: ${task.title}`,
      );
      return { text: [...added, "", formatList(day, tasks)].join("\n"), tasks };
    }
    case "upcoming":
      return { text: formatUpcoming(today(), await listUpcoming()) };
    case "edit":
    case "move": {
      // Numbers refer to what's left on the list, like /done.
      const before = await listForToday();
      const task = openTasks(before.tasks)[command.target - 1];
      if (!task) return { text: `#${command.target}: there is no task with that number. Send /list to check.` };

      const oldTitle = task.title;
      let line: string;
      if (command.kind === "edit") {
        const result = await editTask(task.id, { title: command.title });
        if (!result.ok) return { text: `“${oldTitle}”: ${result.error}` };
        line = `Renamed: ${oldTitle} → ${result.task.title}`;
      } else {
        const when = parseDayWord(command.when, before.day);
        if (!when) return { text: `I couldn’t read “${command.when}” as a day. Try “tomorrow”, “fri” or “12 oct”.` };
        const result = await editTask(task.id, { day: when });
        if (!result.ok) return { text: `“${oldTitle}”: ${result.error}` };
        line = `Moved to ${describeScheduleDay(result.task.task_date, before.day)}: ${result.task.title}`;
      }
      const after = await listForToday();
      return { text: [line, "", formatList(after.day, after.tasks)].join("\n"), tasks: after.tasks };
    }
    case "undo": {
      const before = await listForToday();
      const done = doneTasks(before.tasks);
      // A bare /undo shows today's finished tasks with their own numbers.
      if (command.targets === "list") return { text: formatDoneList(before.day, before.tasks) };
      const lines = await applyByNumber(command.targets, done, undoTask, (task) => `Undone: ${task.title}`);
      const after = await listForToday();
      return { text: [...lines, "", formatList(after.day, after.tasks)].join("\n"), tasks: after.tasks };
    }
    case "done":
    case "remove": {
      // Numbers refer to what's left on the list right now, the same as /list and the buttons.
      const before = await listForToday();
      const open = openTasks(before.tasks);
      const targets = command.targets === "all" ? open.map((_, index) => index + 1) : command.targets;
      if (targets.length === 0) return { text: "Everything on the list is already done. 🎉" };

      const lines =
        command.kind === "done"
          ? await applyByNumber(targets, open, completeTask, (task) => `Done: ${task.title}`)
          : await applyByNumber(targets, open, removeTask, (task) =>
              "removal" in task && task.removal === "drop"
                ? task.routine_id && task.task_date === before.day
                  ? `Skipped for today: ${task.title}`
                  : `Let go (kept on record): ${task.title}`
                : `Removed: ${task.title}`,
            );

      const after = await listForToday();
      return { text: [...lines, "", formatList(after.day, after.tasks)].join("\n"), tasks: after.tasks };
    }
  }
}

/**
 * Applies a tap on a task button. Returns the pop-up text and the fresh list, so
 * the tapped message can be updated even when nothing changed (e.g. the task was
 * already ticked off in the app).
 */
export async function handleButton(data: string | undefined): Promise<{ notice: string; text: string; tasks: Task[] }> {
  const button = parseButton(data);
  let notice: string;
  if (!button) {
    notice = "That button is no longer valid.";
  } else {
    const result = button.action === "done" ? await completeTask(button.taskId) : await undoTask(button.taskId);
    notice = result.ok
      ? `${button.action === "done" ? "Done" : "Undone"}: ${result.task.title}`
      : result.error;
  }
  const { day, tasks } = await listForToday();
  return { notice, text: formatList(day, tasks), tasks };
}
