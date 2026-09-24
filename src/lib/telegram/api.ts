import "server-only";

const TELEGRAM_MESSAGE_LIMIT = 4096;

/**
 * Sends a message through the Bot API. Replies are sent explicitly rather than as
 * a method in the webhook response, because Telegram never reports whether a
 * webhook-response method succeeded — failures would be silent.
 */
export async function sendMessage(chatId: number, text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not set");

  const body = {
    chat_id: chatId,
    text: text.length > TELEGRAM_MESSAGE_LIMIT ? `${text.slice(0, TELEGRAM_MESSAGE_LIMIT - 1)}…` : text,
  };
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(8000),
  });
  const result = (await response.json().catch(() => null)) as { ok?: boolean; description?: string } | null;
  if (!result?.ok) {
    throw new Error(`sendMessage failed (${response.status}): ${result?.description ?? "no response body"}`);
  }
}
