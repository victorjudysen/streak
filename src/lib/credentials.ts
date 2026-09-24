import "server-only";

import { cache } from "react";
import { isConfigured } from "@/lib/config";
import { hashPassword, verifyPassword } from "@/lib/password";
import { validateNewPassword } from "@/lib/password-rules";
import { matchesEnvPassword } from "@/lib/session";
import { db } from "@/lib/supabase";

// Where the login password lives:
// - Until it is changed in the app, APP_PASSWORD (environment variable), version 0.
// - After a change, the hash in app_settings, which then takes precedence.
// Deleting the app_settings row in Supabase falls back to APP_PASSWORD again —
// the recovery path if the password is forgotten.

interface StoredPassword {
  password_hash: string;
  password_version: number;
}

async function loadStored(): Promise<StoredPassword | null> {
  if (!isConfigured("database")) return null;
  const { data, error } = await db()
    .from("app_settings")
    .select("password_hash, password_version")
    .eq("id", true)
    .maybeSingle<StoredPassword>();
  // Table not created yet (migration pending): behave as if no password was changed.
  if (error?.code === "PGRST205" || error?.code === "42P01") return null;
  if (error) throw new Error(`Could not load settings: ${error.message}`);
  return data;
}

/** Deduplicated per request, so several checks on one page cost one query. */
export const currentPasswordVersion = cache(async (): Promise<number> => {
  return (await loadStored())?.password_version ?? 0;
});

/** Returns the password version on success, or null. */
export async function checkPassword(attempt: string): Promise<number | null> {
  const stored = await loadStored();
  if (stored) return (await verifyPassword(attempt, stored.password_hash)) ? stored.password_version : null;
  return matchesEnvPassword(attempt) ? 0 : null;
}

export type ChangeResult = { ok: true; version: number } | { ok: false; error: string };

export async function changePassword(current: string, next: string, confirm: string): Promise<ChangeResult> {
  if ((await checkPassword(current)) === null) {
    return { ok: false, error: "Your current password isn’t right." };
  }
  const problem = validateNewPassword(next, confirm, current);
  if (problem) return { ok: false, error: problem };

  const version = (await currentPasswordVersion()) + 1;
  const { error } = await db()
    .from("app_settings")
    .upsert({
      id: true,
      password_hash: await hashPassword(next),
      password_version: version,
      updated_at: new Date().toISOString(),
    });
  if (error) return { ok: false, error: `Could not save: ${error.message}` };
  return { ok: true, version };
}
