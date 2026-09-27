import "server-only";

import type { Task } from "@/lib/task-rules";
import { addTasks, completeTask, listForToday, removeTask, undoTask } from "@/lib/tasks";
import { parseCommand } from "@/lib/telegram/commands";
import { formatList, parseButton } from "@/lib/telegram/format";

export const HELP_TEXT = [
  "Streak bot — your daily list.",
  "",
  "Just send a message to add it as a task (one task per line).",
  "",
  "/list — today’s numbered list",
  "/done 2 — mark task 2 done (also /done 1 3, /done 2-4, /done all)",
  "/undo 2 — un-mark a task you completed today",
  "/remove 2 — remove a task",
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
      const result = await addTasks(command.titles, "telegram");
      if (!result.ok) return { text: `Nothing was added. ${result.error}` };
      const { day, tasks } = await listForToday();
      const added = result.task.map((task) => `Added: ${task.title}`);
      return { text: [...added, "", formatList(day, tasks)].join("\n"), tasks };
    }
    case "done":
    case "undo":
    case "remove": {
      // Numbers always refer to the list as it is right now, the same order as /list.
      const before = await listForToday();
      const targets =
        command.targets === "all"
          ? before.tasks.flatMap((task, index) => (task.done_at ? [] : [index + 1]))
          : command.targets;
      if (targets.length === 0) return { text: "Everything on the list is already done. 🎉" };

      const lines =
        command.kind === "done"
          ? await applyByNumber(targets, before.tasks, completeTask, (task) => `Done: ${task.title}`)
          : command.kind === "undo"
            ? await applyByNumber(targets, before.tasks, undoTask, (task) => `Undone: ${task.title}`)
            : await applyByNumber(targets, before.tasks, removeTask, (task) =>
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
