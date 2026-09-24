import { timingSafeEqual } from "node:crypto";
import { isConfigured } from "@/lib/config";
import { claimTelegramUpdate } from "@/lib/tasks";
import { sendMessage } from "@/lib/telegram/api";
import { handleMessage } from "@/lib/telegram/handle";

// Telegram calls this URL (a "webhook") every time someone messages the bot.
// Setup: `npm run telegram:setup` — see README.

interface TelegramUpdate {
  update_id: number;
  message?: { chat: { id: number }; text?: string };
}

function secretMatches(received: string | null): boolean {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!received || !expected) return false;
  const [a, b] = [Buffer.from(received), Buffer.from(expected)];
  return a.length === b.length && timingSafeEqual(a, b);
}

const ok = () => new Response(null, { status: 200 });

/** Sends a reply; a failure is logged rather than retried, so Telegram doesn't redeliver. */
async function reply(updateId: number, chatId: number, text: string): Promise<Response> {
  try {
    await sendMessage(chatId, text);
    console.info(`telegram update ${updateId}: replied`);
  } catch (error) {
    console.error(`telegram update ${updateId}: reply failed`, error);
  }
  return ok();
}

export async function POST(request: Request): Promise<Response> {
  if (!isConfigured("telegram") || !isConfigured("database")) {
    console.error("telegram webhook: environment variables missing");
    return new Response("Telegram is not configured", { status: 503 });
  }
  // Only Telegram knows the secret we registered with setWebhook.
  if (!secretMatches(request.headers.get("x-telegram-bot-api-secret-token"))) {
    console.warn("telegram webhook: rejected request with a wrong or missing secret");
    return new Response("Forbidden", { status: 403 });
  }

  const update = (await request.json().catch(() => null)) as TelegramUpdate | null;
  const message = update?.message;
  if (!update || !message?.text) return ok();

  const chatId = message.chat.id;
  const allowedChatId = process.env.TELEGRAM_ALLOWED_CHAT_ID;

  // First-time setup: tell Victor his chat id so he can lock the bot to it.
  if (!allowedChatId) {
    console.info(`telegram update ${update.update_id}: setup mode, message from chat ${chatId}`);
    return reply(
      update.update_id,
      chatId,
      `Almost set up. Your chat id is ${chatId}.\nAdd TELEGRAM_ALLOWED_CHAT_ID=${chatId} to the app’s environment variables and redeploy. Until then I won’t change any tasks.`,
    );
  }
  // Anyone else who finds the bot is ignored.
  if (String(chatId) !== allowedChatId) {
    console.warn(`telegram update ${update.update_id}: ignored message from chat ${chatId}`);
    return ok();
  }

  let text: string;
  try {
    if (!(await claimTelegramUpdate(update.update_id))) {
      console.info(`telegram update ${update.update_id}: duplicate delivery skipped`);
      return ok();
    }
    text = await handleMessage(message.text);
  } catch (error) {
    console.error(`telegram update ${update.update_id}: handling failed`, error);
    text = "Something went wrong on my side, so nothing may have changed. Send /list to check.";
  }
  return reply(update.update_id, chatId, text);
}
