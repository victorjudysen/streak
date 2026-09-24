import "server-only";

import { addDays, localDate, timeZone, today } from "@/lib/dates";
import { db } from "@/lib/supabase";
import {
  decideComplete,
  decideRemove,
  decideUndo,
  isOnList,
  sortTasks,
  validateTitle,
  type Task,
  type TaskSource,
} from "@/lib/task-rules";

// The single data layer for tasks. Both the web app and the Telegram bot call these
// functions, so there is exactly one source of truth and one set of rules.

export type Result<T = Task> = { ok: true; task: T } | { ok: false; error: string };

const COLUMNS = "id, seq, title, task_date, done_at, dropped_at, source, created_at";

/** Today's list: today's tasks plus anything unfinished from earlier days. */
export async function listForToday(): Promise<{ day: string; tasks: Task[] }> {
  const day = today();
  // Anything completed today finished within the last ~36 hours, whatever the zone.
  const recent = new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString();

  const { data, error } = await db()
    .from("tasks")
    .select(COLUMNS)
    .is("dropped_at", null)
    .lte("task_date", day)
    .or(`task_date.eq.${day},done_at.is.null,done_at.gte."${recent}"`);

  if (error) throw new Error(`Could not load tasks: ${error.message}`);
  const rows = data as Task[];
  return { day, tasks: sortTasks(rows.filter((task) => isOnList(task, day))) };
}

export async function addTasks(rawTitles: string[], source: TaskSource): Promise<Result<Task[]>> {
  const titles: string[] = [];
  for (const raw of rawTitles) {
    const checked = validateTitle(raw);
    if ("error" in checked) return { ok: false, error: checked.error };
    titles.push(checked.title);
  }
  if (titles.length === 0) return { ok: false, error: "Write something first." };

  const day = today();
  const { data, error } = await db()
    .from("tasks")
    .insert(titles.map((title) => ({ title, task_date: day, source })))
    .select(COLUMNS);

  if (error) return { ok: false, error: `Could not save: ${error.message}` };
  return { ok: true, task: sortTasks(data as Task[]) };
}

async function find(id: string): Promise<Task | null> {
  const { data, error } = await db().from("tasks").select(COLUMNS).eq("id", id).maybeSingle<Task>();
  if (error) throw new Error(`Could not load task: ${error.message}`);
  return data;
}

async function patch(id: string, values: Partial<Task>): Promise<Result> {
  const { data, error } = await db()
    .from("tasks")
    .update(values)
    .eq("id", id)
    .select(COLUMNS)
    .single<Task>();
  if (error) return { ok: false, error: `Could not save: ${error.message}` };
  return { ok: true, task: data };
}

export async function completeTask(id: string): Promise<Result> {
  const task = await find(id);
  if (!task) return { ok: false, error: "That task no longer exists." };
  const decision = decideComplete(task);
  if ("error" in decision) return { ok: false, error: decision.error };
  return patch(id, { done_at: new Date().toISOString() });
}

export async function undoTask(id: string): Promise<Result> {
  const task = await find(id);
  if (!task) return { ok: false, error: "That task no longer exists." };
  const decision = decideUndo(task, today());
  if ("error" in decision) return { ok: false, error: decision.error };
  return patch(id, { done_at: null });
}

export async function removeTask(id: string): Promise<Result<Task & { removal: "delete" | "drop" }>> {
  const task = await find(id);
  if (!task) return { ok: false, error: "That task no longer exists." };
  const decision = decideRemove(task, today());
  if ("error" in decision) return { ok: false, error: decision.error };

  if (decision.action === "drop") {
    const result = await patch(id, { dropped_at: new Date().toISOString() });
    return result.ok ? { ok: true, task: { ...result.task, removal: "drop" } } : result;
  }

  const { error } = await db().from("tasks").delete().eq("id", id);
  if (error) return { ok: false, error: `Could not remove: ${error.message}` };
  return { ok: true, task: { ...task, removal: "delete" } };
}

/** Number of tasks completed on each local day, from `since` (inclusive) to today. */
export async function completionsByDay(since: string): Promise<Map<string, number>> {
  const zone = timeZone();
  // Start a day early so completions just after local midnight are not missed.
  const from = new Date(`${addDays(since, -1)}T00:00:00Z`).toISOString();

  const { data, error } = await db()
    .from("tasks")
    .select("done_at")
    .gte("done_at", from);

  if (error) throw new Error(`Could not load activity: ${error.message}`);

  const counts = new Map<string, number>();
  for (const { done_at } of data as { done_at: string }[]) {
    const day = localDate(done_at, zone);
    if (day >= since) counts.set(day, (counts.get(day) ?? 0) + 1);
  }
  return counts;
}

/** Records a Telegram update id. Returns false if it was already processed. */
export async function claimTelegramUpdate(updateId: number): Promise<boolean> {
  const { error } = await db().from("telegram_updates").insert({ update_id: updateId });
  if (!error) return true;
  if (error.code === "23505") return false; // unique violation → duplicate delivery
  throw new Error(`Could not record Telegram update: ${error.message}`);
}
