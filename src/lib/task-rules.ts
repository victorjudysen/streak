// The rules for what can happen to a task, shared by the web app and Telegram.
// Pure functions only — no database — so they are easy to test.
//
// "Closed days stay closed" (docs/product-goals.md): today can be corrected freely,
// but a completion recorded on an earlier day cannot be undone or erased.

import { localDate } from "@/lib/dates";

export type TaskSource = "app" | "telegram";

export interface Task {
  id: string;
  /** Insertion order; keeps list numbers stable. */
  seq: number;
  title: string;
  task_date: string;
  done_at: string | null;
  dropped_at: string | null;
  source: TaskSource;
  created_at: string;
  /** The routine this task was created from; null for one-off tasks. */
  routine_id: string | null;
}

export const MAX_TITLE_LENGTH = 280;

export function cleanTitle(raw: string): string {
  return raw.replace(/\s+/g, " ").trim();
}

export function validateTitle(raw: string): { title: string } | { error: string } {
  const title = cleanTitle(raw);
  if (!title) return { error: "Write something first." };
  if (title.length > MAX_TITLE_LENGTH) {
    return { error: `Keep it under ${MAX_TITLE_LENGTH} characters.` };
  }
  return { title };
}

/**
 * Whether a task belongs on the list for `day`:
 * - anything planned for that day, done or not;
 * - unfinished tasks carried over from earlier days;
 * - carried-over tasks that were completed on that day.
 */
export function isOnList(task: Task, day: string, zone?: string): boolean {
  if (task.dropped_at) return false;
  if (task.task_date === day) return true;
  if (task.task_date > day) return false;
  return task.done_at === null || localDate(task.done_at, zone) === day;
}

export function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort(
    (a, b) => a.task_date.localeCompare(b.task_date) || a.seq - b.seq,
  );
}

export function isCarriedOver(task: Task, day: string): boolean {
  return task.task_date < day;
}

export type Decision<T extends string> = { action: T } | { error: string };

export function decideComplete(task: Task): Decision<"complete"> {
  if (task.dropped_at) return { error: "That task was let go." };
  if (task.done_at) return { error: "Already done." };
  return { action: "complete" };
}

export function decideUndo(task: Task, day: string, zone?: string): Decision<"undo"> {
  if (!task.done_at) return { error: "It isn’t marked done." };
  if (localDate(task.done_at, zone) !== day) {
    return { error: "That was completed on a closed day, so it stays as recorded." };
  }
  return { action: "undo" };
}

/**
 * Today's tasks are deleted outright (a typo or change of plan). An unfinished task
 * from an earlier day is "let go" instead — hidden from the list but kept on record.
 * Today's routine task is also let go rather than deleted, so it is skipped for the
 * day instead of being recreated the next time the list loads.
 */
export function decideRemove(task: Task, day: string, zone?: string): Decision<"delete" | "drop"> {
  if (task.dropped_at) return { error: "That task was already let go." };
  if (task.task_date === day && task.routine_id) {
    return task.done_at ? { error: "Undo it first, then skip it." } : { action: "drop" };
  }
  if (task.task_date === day) return { action: "delete" };
  if (task.task_date > day) return { error: "That task is planned for a later day." };
  if (task.done_at) {
    return localDate(task.done_at, zone) === day
      ? { error: "Undo it first, then remove it." }
      : { error: "That was completed on a closed day, so it stays as recorded." };
  }
  return { action: "drop" };
}
