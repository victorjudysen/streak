import { timingSafeEqual } from "node:crypto";
import { isConfigured } from "@/lib/config";
import { claimTelegramUpdate } from "@/lib/tasks";
import { answerCallbackQuery, editMessageText, sendMessage } from "@/lib/telegram/api";
import { taskButtons } from "@/lib/telegram/format";
import { handleButton, handleMessage, type BotReply } from "@/lib/telegram/handle";

// Telegram calls this URL (a "webhook") every time someone messages the bot or taps
// one of its buttons. Setup: `npm run telegram:setup` — see README.

interface TelegramUpdate {
  update_id: number;
  message?: { chat: { id: number }; text?: string };
  callback_query?: {
    id: string;
    data?: string;
    message?: { message_id: number; chat: { id: number } };
  };
}

function secretMatches(received: string | null): boolean {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!received || !expected) return false;
  const [a, b] = [Buffer.from(received), Buffer.from(expected)];
  return a.length === b.length && timingSafeEqual(a, b);
}

const ok = () => new Response(null, { status: 200 });

/** Sends a reply; a failure is logged rather than retried, so Telegram doesn't redeliver. */
async function reply(updateId: number, chatId: number, { text, tasks }: BotReply): Promise<Response> {
  try {
    await sendMessage(chatId, text, tasks ? taskButtons(tasks) : undefined);
    console.info(`telegram update ${updateId}: replied`);
  } catch (error) {
    console.error(`telegram update ${updateId}: reply failed`, error);
  }
  return ok();
}

/** A tap on a task button: tick/untick, confirm with a pop-up, refresh the tapped message. */
async function onButton(updateId: number, query: NonNullable<TelegramUpdate["callback_query"]>): Promise<Response> {
  const message = query.message;
  if (!message) return ok();

  let notice = "Something went wrong on my side. Send /list to check.";
  try {
    if (!(await claimTelegramUpdate(updateId))) {
      console.info(`telegram update ${updateId}: duplicate button tap skipped`);
      return ok();
    }
    const result = await handleButton(query.data);
    notice = result.notice;
    await editMessageText(message.chat.id, message.message_id, result.text, taskButtons(result.tasks));
    console.info(`telegram update ${updateId}: button handled`);
  } catch (error) {
    console.error(`telegram update ${updateId}: button failed`, error);
  }
  try {
    await answerCallbackQuery(query.id, notice);
  } catch (error) {
    console.error(`telegram update ${updateId}: answering button failed`, error);
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
  if (!update) return ok();
  const allowedChatId = process.env.TELEGRAM_ALLOWED_CHAT_ID;

  // Button taps. Only the allowed chat's buttons do anything.
  if (update.callback_query) {
    const chatId = update.callback_query.message?.chat.id;
    if (!allowedChatId || String(chatId) !== allowedChatId) {
      console.warn(`telegram update ${update.update_id}: ignored button from chat ${chatId}`);
      return ok();
    }
    return onButton(update.update_id, update.callback_query);
  }

  const message = update.message;
  if (!message?.text) return ok();
  const chatId = message.chat.id;

  // First-time setup: tell Victor his chat id so he can lock the bot to it.
  if (!allowedChatId) {
    console.info(`telegram update ${update.update_id}: setup mode, message from chat ${chatId}`);
    return reply(update.update_id, chatId, {
      text: `Almost set up. Your chat id is ${chatId}.\nAdd TELEGRAM_ALLOWED_CHAT_ID=${chatId} to the app’s environment variables and redeploy. Until then I won’t change any tasks.`,
    });
  }
  // Anyone else who finds the bot is ignored.
  if (String(chatId) !== allowedChatId) {
    console.warn(`telegram update ${update.update_id}: ignored message from chat ${chatId}`);
    return ok();
  }

  let answer: BotReply;
  try {
    if (!(await claimTelegramUpdate(update.update_id))) {
      console.info(`telegram update ${update.update_id}: duplicate delivery skipped`);
      return ok();
    }
    answer = await handleMessage(message.text);
  } catch (error) {
    console.error(`telegram update ${update.update_id}: handling failed`, error);
    answer = { text: "Something went wrong on my side, so nothing may have changed. Send /list to check." };
  }
  return reply(update.update_id, chatId, answer);
}
