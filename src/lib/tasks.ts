import "server-only";

import { addDays, localDate, timeZone, today } from "@/lib/dates";
import { checkScheduleDay } from "@/lib/day-words";
import { broadcastTasksChanged } from "@/lib/realtime";
import { fetchAll } from "@/lib/paging";
import { db } from "@/lib/supabase";
import { isActive, isScheduledOn, type Routine } from "@/lib/routine-rules";
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
// functions, so there is exactly one source of truth and one set of rules. Every
// successful change broadcasts a signal so open dashboards update live.

export type Result<T = Task> = { ok: true; task: T } | { ok: false; error: string };

const COLUMNS = "id, seq, title, task_date, done_at, dropped_at, source, created_at, routine_id";

/**
 * Creates today's task for every active routine scheduled today, unless it already
 * exists. Safe to call repeatedly: the (routine_id, task_date) constraint ignores
 * duplicates. Runs whenever the list loads, which includes the 9am digest.
 */
async function ensureRoutineTasks(day: string): Promise<void> {
  const { data, error } = await db()
    .from("routines")
    .select("id, title, weekdays, paused_at, archived_at")
    .is("archived_at", null)
    .is("paused_at", null);
  // Table not created yet (migration pending): no routines.
  if (error?.code === "PGRST205" || error?.code === "42P01") return;
  if (error) throw new Error(`Could not load routines: ${error.message}`);

  const due = (data as Routine[]).filter((routine) => isActive(routine) && isScheduledOn(routine, day));
  if (due.length === 0) return;

  const { data: created, error: insertError } = await db()
    .from("tasks")
    .upsert(
      due.map((routine) => ({ title: routine.title, task_date: day, source: "app", routine_id: routine.id })),
      { onConflict: "routine_id,task_date", ignoreDuplicates: true },
    )
    .select("id");
  if (insertError) throw new Error(`Could not create routine tasks: ${insertError.message}`);
  if (created && created.length > 0) await broadcastTasksChanged();
}

/** Today's list: today's tasks plus anything unfinished from earlier days. */
export async function listForToday(): Promise<{ day: string; tasks: Task[] }> {
  const day = today();
  await ensureRoutineTasks(day);
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

/** A task to add: its title, and the day it's for (today when omitted). */
export interface NewTask {
  title: string;
  day?: string | null;
}

export async function addTasks(items: NewTask[], source: TaskSource): Promise<Result<Task[]>> {
  const now = today();
  const rows: { title: string; task_date: string; source: TaskSource }[] = [];
  for (const item of items) {
    const checked = validateTitle(item.title);
    if ("error" in checked) return { ok: false, error: checked.error };
    const when = checkScheduleDay(item.day ?? now, now);
    if ("error" in when) return { ok: false, error: when.error };
    rows.push({ title: checked.title, task_date: when.day, source });
  }
  if (rows.length === 0) return { ok: false, error: "Write something first." };

  const { data, error } = await db().from("tasks").insert(rows).select(COLUMNS);

  if (error) return { ok: false, error: `Could not save: ${error.message}` };
  await broadcastTasksChanged();
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
  await broadcastTasksChanged();
  return { ok: true, task: data };
}

export async function completeTask(id: string): Promise<Result> {
  const task = await find(id);
  if (!task) return { ok: false, error: "That task no longer exists." };
  const decision = decideComplete(task, today());
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
  await broadcastTasksChanged();
  return { ok: true, task: { ...task, removal: "delete" } };
}

/** Unfinished tasks planned for later days, soonest first. */
export async function listUpcoming(): Promise<Task[]> {
  const day = today();
  const rows = await fetchAll<Task>((start, end) =>
    db()
      .from("tasks")
      .select(COLUMNS)
      .gt("task_date", day)
      .is("done_at", null)
      .is("dropped_at", null)
      .order("task_date")
      .order("seq")
      .range(start, end),
  ).catch((error: Error) => {
    throw new Error(`Could not load upcoming tasks: ${error.message}`);
  });
  return rows;
}

/** Number of tasks completed on each local day, from `since` (inclusive) to today. */
export async function completionsByDay(since: string): Promise<Map<string, number>> {
  const zone = timeZone();
  // Start a day early so completions just after local midnight are not missed.
  const from = new Date(`${addDays(since, -1)}T00:00:00Z`).toISOString();

  // Paged: a busy year has more than Supabase's 1,000-rows-per-request limit.
  const rows = await fetchAll<{ done_at: string }>((start, end) =>
    db().from("tasks").select("done_at").gte("done_at", from).order("done_at").order("id").range(start, end),
  ).catch((error: Error) => {
    throw new Error(`Could not load activity: ${error.message}`);
  });

  const counts = new Map<string, number>();
  for (const { done_at } of rows) {
    const day = localDate(done_at, zone);
    if (day >= since) counts.set(day, (counts.get(day) ?? 0) + 1);
  }
  return counts;
}

/**
 * Tasks completed on one local day, in the order they were ticked off. Uses the
 * same rule as completionsByDay(), so the list always matches that day's square.
 */
export async function completedOn(day: string): Promise<Task[]> {
  const zone = timeZone();
  // A two-day margin either side covers every time zone; the exact day is filtered below.
  const from = new Date(`${addDays(day, -1)}T00:00:00Z`).toISOString();
  const to = new Date(`${addDays(day, 2)}T00:00:00Z`).toISOString();
  const rows = await fetchAll<Task>((start, end) =>
    db().from("tasks").select(COLUMNS).gte("done_at", from).lt("done_at", to).order("done_at").order("id").range(start, end),
  ).catch((error: Error) => {
    throw new Error(`Could not load that day: ${error.message}`);
  });
  return rows.filter((task) => task.done_at && localDate(task.done_at, zone) === day);
}

/** The year of the first completed task, for the map's year buttons (null if none yet). */
export async function firstCompletionYear(): Promise<number | null> {
  const { data, error } = await db()
    .from("tasks")
    .select("done_at")
    .not("done_at", "is", null)
    .order("done_at", { ascending: true })
    .limit(1)
    .maybeSingle<{ done_at: string }>();
  if (error) throw new Error(`Could not load history: ${error.message}`);
  return data ? Number(localDate(data.done_at, timeZone()).slice(0, 4)) : null;
}

/** Records a Telegram update id. Returns false if it was already processed. */
export async function claimTelegramUpdate(updateId: number): Promise<boolean> {
  const { error } = await db().from("telegram_updates").insert({ update_id: updateId });
  if (!error) return true;
  if (error.code === "23505") return false; // unique violation → duplicate delivery
  throw new Error(`Could not record Telegram update: ${error.message}`);
}
