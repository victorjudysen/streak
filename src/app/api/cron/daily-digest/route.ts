import { timingSafeEqual } from "node:crypto";
import { isConfigured } from "@/lib/config";
import { localHour } from "@/lib/dates";
import { listForToday } from "@/lib/tasks";
import { sendMessage } from "@/lib/telegram/api";
import { formatMorningDigest, taskButtons } from "@/lib/telegram/format";

// Sends today's list to the owner on Telegram. Netlify calls this every hour on the
// hour (netlify/functions/daily-digest.mts); it only sends when it's DIGEST_HOUR
// (default 9) in STREAK_TIMEZONE, so "9am" means 9am wherever you live.
// Requires CRON_SECRET. Add ?now=1 to send immediately, e.g. to test.

function authorized(request: Request): boolean {
  const expected = process.env.CRON_SECRET;
  const received = request.headers.get("authorization")?.replace(/^Bearer /, "");
  if (!expected || !received) return false;
  const [a, b] = [Buffer.from(received), Buffer.from(expected)];
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request): Promise<Response> {
  if (!authorized(request)) return new Response("Forbidden", { status: 403 });

  const digestHour = Number(process.env.DIGEST_HOUR ?? 9);
  const forced = new URL(request.url).searchParams.get("now") === "1";
  if (!forced && localHour(new Date()) !== digestHour) {
    return Response.json({ sent: false, reason: `not ${digestHour}:00 in the configured time zone` });
  }

  const chatId = Number(process.env.TELEGRAM_ALLOWED_CHAT_ID);
  if (!isConfigured("database") || !process.env.TELEGRAM_BOT_TOKEN || !chatId) {
    console.error("daily digest: database or Telegram is not configured");
    return new Response("Not configured", { status: 503 });
  }

  try {
    const { day, tasks } = await listForToday();
    await sendMessage(chatId, formatMorningDigest(day, tasks), taskButtons(tasks));
    console.info(`daily digest: sent for ${day} (${tasks.length} tasks)`);
    return Response.json({ sent: true, day, tasks: tasks.length });
  } catch (error) {
    console.error("daily digest: failed", error);
    return new Response("Failed to send the digest", { status: 500 });
  }
}
