import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { currentPasswordVersion } from "@/lib/credentials";
import { SESSION_COOKIE, readSessionToken } from "@/lib/session";

/** A valid cookie issued under the current password version. */
async function hasValidSession(): Promise<boolean> {
  const version = readSessionToken((await cookies()).get(SESSION_COOKIE)?.value);
  return version !== null && version === (await currentPasswordVersion());
}

/** Server actions are reachable by direct POST, so each one re-checks the session. */
export async function requireSession(): Promise<void> {
  if (!(await hasValidSession())) {
    throw new Error("Not signed in");
  }
}

/** For pages: send signed-out visitors to /login. Also makes the page render per request. */
export async function requirePageSession(): Promise<void> {
  if (!(await hasValidSession())) redirect("/login");
}
