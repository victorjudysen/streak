import "server-only";

import type { InlineKeyboard } from "@/lib/telegram/format";

const TELEGRAM_MESSAGE_LIMIT = 4096;

type ApiResult = { ok?: boolean; description?: string } | null;

async function call(method: string, body: Record<string, unknown>): Promise<ApiResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not set");
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(8000),
  });
  const result = (await response.json().catch(() => null)) as ApiResult;
  if (!result?.ok) {
    throw new Error(`${method} failed (${response.status}): ${result?.description ?? "no response body"}`);
  }
  return result;
}

function clip(text: string): string {
  return text.length > TELEGRAM_MESSAGE_LIMIT ? `${text.slice(0, TELEGRAM_MESSAGE_LIMIT - 1)}…` : text;
}

function markup(keyboard?: InlineKeyboard) {
  return keyboard ? { reply_markup: { inline_keyboard: keyboard } } : {};
}

/**
 * Sends a message through the Bot API. Replies are sent explicitly rather than as
 * a method in the webhook response, because Telegram never reports whether a
 * webhook-response method succeeded — failures would be silent.
 */
export async function sendMessage(chatId: number, text: string, keyboard?: InlineKeyboard): Promise<void> {
  await call("sendMessage", { chat_id: chatId, text: clip(text), ...markup(keyboard) });
}

/** Replaces a message the bot sent earlier, e.g. the list after a button tap. */
export async function editMessageText(
  chatId: number,
  messageId: number,
  text: string,
  keyboard?: InlineKeyboard,
): Promise<void> {
  try {
    // Without a keyboard, an empty one removes the old buttons.
    await call("editMessageText", {
      chat_id: chatId,
      message_id: messageId,
      text: clip(text),
      reply_markup: { inline_keyboard: keyboard ?? [] },
    });
  } catch (error) {
    // Tapping a button that changes nothing leaves the message identical; that's fine.
    if (error instanceof Error && error.message.includes("message is not modified")) return;
    throw error;
  }
}

/** Stops the button's loading spinner and shows a short pop-up. */
export async function answerCallbackQuery(callbackQueryId: string, text: string): Promise<void> {
  await call("answerCallbackQuery", { callback_query_id: callbackQueryId, text: text.slice(0, 200) });
}
