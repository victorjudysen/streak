import { timingSafeEqual } from "node:crypto";
import { isConfigured } from "@/lib/config";
import { claimTelegramUpdate } from "@/lib/tasks";
import { handleMessage } from "@/lib/telegram/handle";

// Telegram calls this URL (a "webhook") every time someone messages the bot.
// Setup: `npm run telegram:setup` — see README.

interface TelegramUpdate {
  update_id: number;
  message?: { chat: { id: number }; text?: string };
}

const TELEGRAM_MESSAGE_LIMIT = 4096;

function secretMatches(received: string | null): boolean {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!received || !expected) return false;
  const [a, b] = [Buffer.from(received), Buffer.from(expected)];
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Answering with a method in the response body lets Telegram send the reply itself. */
function reply(chatId: number, text: string): Response {
  return Response.json({
    method: "sendMessage",
    chat_id: chatId,
    text: text.length > TELEGRAM_MESSAGE_LIMIT ? `${text.slice(0, TELEGRAM_MESSAGE_LIMIT - 1)}…` : text,
  });
}

const ok = () => new Response(null, { status: 200 });

export async function POST(request: Request): Promise<Response> {
  if (!isConfigured("telegram") || !isConfigured("database")) {
    return new Response("Telegram is not configured", { status: 503 });
  }
  // Only Telegram knows the secret we registered with setWebhook.
  if (!secretMatches(request.headers.get("x-telegram-bot-api-secret-token"))) {
    return new Response("Forbidden", { status: 403 });
  }

  const update = (await request.json().catch(() => null)) as TelegramUpdate | null;
  const message = update?.message;
  if (!update || !message?.text) return ok();

  const chatId = message.chat.id;
  const allowedChatId = process.env.TELEGRAM_ALLOWED_CHAT_ID;

  // First-time setup: tell Victor his chat id so he can lock the bot to it.
  if (!allowedChatId) {
    return reply(
      chatId,
      `Almost set up. Your chat id is ${chatId}.\nAdd TELEGRAM_ALLOWED_CHAT_ID=${chatId} to the app’s environment variables and redeploy. Until then I won’t change any tasks.`,
    );
  }
  // Anyone else who finds the bot is ignored.
  if (String(chatId) !== allowedChatId) return ok();

  try {
    if (!(await claimTelegramUpdate(update.update_id))) return ok(); // duplicate delivery
    return reply(chatId, await handleMessage(message.text));
  } catch (error) {
    console.error("Telegram webhook failed", error);
    return reply(chatId, "Something went wrong on my side, so nothing may have changed. Send /list to check.");
  }
}
