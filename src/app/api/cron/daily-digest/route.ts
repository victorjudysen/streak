import { timingSafeEqual } from "node:crypto";
import { isConfigured } from "@/lib/config";
import { listForToday } from "@/lib/tasks";
import { sendMessage } from "@/lib/telegram/api";
import { formatMorningDigest } from "@/lib/telegram/format";

// Sends today's list to Victor on Telegram. Called every morning by the Netlify
// scheduled function in netlify/functions/daily-digest.mts; requires CRON_SECRET.

function authorized(request: Request): boolean {
  const expected = process.env.CRON_SECRET;
  const received = request.headers.get("authorization")?.replace(/^Bearer /, "");
  if (!expected || !received) return false;
  const [a, b] = [Buffer.from(received), Buffer.from(expected)];
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request): Promise<Response> {
  if (!authorized(request)) return new Response("Forbidden", { status: 403 });

  const chatId = Number(process.env.TELEGRAM_ALLOWED_CHAT_ID);
  if (!isConfigured("database") || !process.env.TELEGRAM_BOT_TOKEN || !chatId) {
    console.error("daily digest: database or Telegram is not configured");
    return new Response("Not configured", { status: 503 });
  }

  try {
    const { day, tasks } = await listForToday();
    await sendMessage(chatId, formatMorningDigest(day, tasks));
    console.info(`daily digest: sent for ${day} (${tasks.length} tasks)`);
    return Response.json({ sent: true, day, tasks: tasks.length });
  } catch (error) {
    console.error("daily digest: failed", error);
    return new Response("Failed to send the digest", { status: 500 });
  }
}
