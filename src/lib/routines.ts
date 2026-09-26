import "server-only";

import { addDays, localDate, timeZone, today } from "@/lib/dates";
import { broadcastTasksChanged } from "@/lib/realtime";
import { routineStreak, type Routine } from "@/lib/routine-rules";
import { db } from "@/lib/supabase";
import { validateTitle } from "@/lib/task-rules";

// Routines: tasks that repeat on chosen weekdays. Today's copy of each routine is
// created by ensureRoutineTasks() in tasks.ts; this file manages the routines.

const COLUMNS = "id, seq, title, weekdays, paused_at, archived_at, created_at";

export type RoutineResult = { ok: true; routine: Routine } | { ok: false; error: string };

export interface RoutineSummary extends Routine {
  /** Scheduled days in a row it was completed, ending today. */
  streak: number;
}

/** Active and paused routines (not removed), with their current streaks. */
export async function listRoutines(): Promise<RoutineSummary[]> {
  const { data, error } = await db()
    .from("routines")
    .select(COLUMNS)
    .is("archived_at", null)
    .order("seq");
  if (error?.code === "PGRST205" || error?.code === "42P01") return [];
  if (error) throw new Error(`Could not load routines: ${error.message}`);
  const routines = data as Routine[];
  if (routines.length === 0) return [];

  // Completed routine tasks over the last year, grouped by routine and local day.
  const day = today();
  const since = addDays(day, -366);
  const { data: done, error: doneError } = await db()
    .from("tasks")
    .select("routine_id, done_at")
    .in("routine_id", routines.map((routine) => routine.id))
    .gte("done_at", new Date(`${addDays(since, -1)}T00:00:00Z`).toISOString());
  if (doneError) throw new Error(`Could not load routine history: ${doneError.message}`);

  const zone = timeZone();
  const doneDays = new Map<string, Set<string>>();
  for (const row of done as { routine_id: string; done_at: string }[]) {
    const days = doneDays.get(row.routine_id) ?? new Set<string>();
    days.add(localDate(row.done_at, zone));
    doneDays.set(row.routine_id, days);
  }

  return routines.map((routine) => ({
    ...routine,
    streak: routineStreak(routine, doneDays.get(routine.id) ?? new Set(), day, since),
  }));
}

export async function createRoutine(rawTitle: string, weekdays: number[]): Promise<RoutineResult> {
  const checked = validateTitle(rawTitle);
  if ("error" in checked) return { ok: false, error: checked.error };

  const { data, error } = await db()
    .from("routines")
    .insert({ title: checked.title, weekdays })
    .select(COLUMNS)
    .single<Routine>();
  if (error) return { ok: false, error: `Could not save: ${error.message}` };
  // Today's task is created the next time the list loads; tell open dashboards to reload.
  await broadcastTasksChanged();
  return { ok: true, routine: data };
}

async function update(id: string, values: Partial<Routine>): Promise<RoutineResult> {
  const { data, error } = await db()
    .from("routines")
    .update(values)
    .eq("id", id)
    .select(COLUMNS)
    .single<Routine>();
  if (error) return { ok: false, error: `Could not save: ${error.message}` };
  return { ok: true, routine: data };
}

/** Paused routines stop appearing from tomorrow; today's task, if created, stays. */
export function setRoutinePaused(id: string, paused: boolean): Promise<RoutineResult> {
  return update(id, { paused_at: paused ? new Date().toISOString() : null });
}

/** Stops the routine for good. Its past tasks and history are kept. */
export function removeRoutine(id: string): Promise<RoutineResult> {
  return update(id, { archived_at: new Date().toISOString() });
}
