"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { changePassword, checkPassword } from "@/lib/credentials";
import { SESSION_COOKIE, SESSION_MAX_AGE, createSessionToken } from "@/lib/session";
import { parseWeekdays } from "@/lib/routine-rules";
import { createRoutine, removeRoutine, setRoutinePaused } from "@/lib/routines";
import { addTasks, completeTask, removeTask, undoTask } from "@/lib/tasks";

export type FormState = { error?: string; success?: string };

// A short pause after a wrong password makes guessing slow.
const slowDown = () => new Promise((resolve) => setTimeout(resolve, 600));

async function startSession(version: number): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, createSessionToken(version), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function signIn(_previous: FormState, formData: FormData): Promise<FormState> {
  const version = await checkPassword(String(formData.get("password") ?? ""));
  if (version === null) {
    await slowDown();
    return { error: "That password isn’t right." };
  }
  await startSession(version);
  redirect("/");
}

export async function changePasswordAction(_previous: FormState, formData: FormData): Promise<FormState> {
  await requireSession();
  const result = await changePassword(
    String(formData.get("current") ?? ""),
    String(formData.get("next") ?? ""),
    String(formData.get("confirm") ?? ""),
  );
  if (!result.ok) {
    await slowDown();
    return { error: result.error };
  }
  // Keep this device signed in under the new version; every other device is signed out.
  await startSession(result.version);
  return { success: "Password changed. Other devices have been signed out." };
}

export async function signOut(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}

export async function addTaskAction(_previous: FormState, formData: FormData): Promise<FormState> {
  await requireSession();
  const result = await addTasks([String(formData.get("title") ?? "")], "app");
  if (!result.ok) return { error: result.error };
  revalidatePath("/");
  return {};
}

export async function setTaskDoneAction(id: string, done: boolean): Promise<FormState> {
  await requireSession();
  const result = done ? await completeTask(id) : await undoTask(id);
  revalidatePath("/");
  return result.ok ? {} : { error: result.error };
}

export async function removeTaskAction(id: string): Promise<FormState> {
  await requireSession();
  const result = await removeTask(id);
  revalidatePath("/");
  return result.ok ? {} : { error: result.error };
}

export async function createRoutineAction(_previous: FormState, formData: FormData): Promise<FormState> {
  await requireSession();
  const weekdays = parseWeekdays(formData.getAll("weekdays"));
  if ("error" in weekdays) return { error: weekdays.error };
  const result = await createRoutine(String(formData.get("title") ?? ""), weekdays);
  if (!result.ok) return { error: result.error };
  revalidatePath("/routines");
  revalidatePath("/");
  return { success: `Added “${result.routine.title}”.` };
}

export async function setRoutinePausedAction(id: string, paused: boolean): Promise<FormState> {
  await requireSession();
  const result = await setRoutinePaused(id, paused);
  revalidatePath("/routines");
  return result.ok ? {} : { error: result.error };
}

export async function removeRoutineAction(id: string): Promise<FormState> {
  await requireSession();
  const result = await removeRoutine(id);
  revalidatePath("/routines");
  return result.ok ? {} : { error: result.error };
}
