import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, isValidSessionToken } from "@/lib/session";

/** Server actions are reachable by direct POST, so each one re-checks the session. */
export async function requireSession(): Promise<void> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!isValidSessionToken(token)) {
    throw new Error("Not signed in");
  }
}

/** For pages: send signed-out visitors to /login. Also makes the page render per request. */
export async function requirePageSession(): Promise<void> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!isValidSessionToken(token)) redirect("/login");
}
