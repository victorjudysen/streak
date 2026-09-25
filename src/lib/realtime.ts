import "server-only";

import { createHmac } from "node:crypto";

// Live updates: whenever tasks change, the server broadcasts a content-free
// "tasks-changed" signal through Supabase Realtime, and any open dashboard reloads
// its data. The signal carries no task data; the channel name is derived from
// SESSION_SECRET and only handed to signed-in pages, so outsiders can't find it.

export const TASKS_CHANGED_EVENT = "tasks-changed";

export function realtimeTopic(): string | null {
  const secret = process.env.SESSION_SECRET;
  if (!secret) return null;
  return `streak-${createHmac("sha256", secret).update("realtime-tasks").digest("hex").slice(0, 32)}`;
}

/** Best effort: a failed signal must never fail the change that triggered it. */
export async function broadcastTasksChanged(): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  const topic = realtimeTopic();
  if (!url || !key || !topic) return;

  try {
    const response = await fetch(`${url}/realtime/v1/api/broadcast`, {
      method: "POST",
      headers: { apikey: key, "content-type": "application/json" },
      body: JSON.stringify({ messages: [{ topic, event: TASKS_CHANGED_EVENT, payload: {} }] }),
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) console.error(`realtime broadcast failed: HTTP ${response.status}`);
  } catch (error) {
    console.error("realtime broadcast failed", error);
  }
}
