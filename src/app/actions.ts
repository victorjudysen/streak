"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { SESSION_COOKIE, SESSION_MAX_AGE, createSessionToken, isCorrectPassword } from "@/lib/session";
import { addTasks, completeTask, removeTask, undoTask } from "@/lib/tasks";

export type FormState = { error?: string };

export async function signIn(_previous: FormState, formData: FormData): Promise<FormState> {
  const password = String(formData.get("password") ?? "");
  if (!isCorrectPassword(password)) {
    // A short pause makes guessing the password slow.
    await new Promise((resolve) => setTimeout(resolve, 600));
    return { error: "That password isn’t right." };
  }
  (await cookies()).set(SESSION_COOKIE, createSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  redirect("/");
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
