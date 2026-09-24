// Tells Telegram where to deliver messages sent to the bot, and registers the
// command menu. Run after deploying: `npm run telegram:setup`
// (reads TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET and APP_URL from .env.local).

const { TELEGRAM_BOT_TOKEN: token, TELEGRAM_WEBHOOK_SECRET: secret, APP_URL: appUrl } = process.env;

function fail(message) {
  console.error(`\n✗ ${message}\n`);
  process.exit(1);
}

if (!token) fail("TELEGRAM_BOT_TOKEN is missing. Create a bot with @BotFather and paste its token into .env.local.");
if (!secret) fail("TELEGRAM_WEBHOOK_SECRET is missing from .env.local.");
if (!appUrl?.startsWith("https://")) {
  fail(`APP_URL must be the public https:// address of the deployed app (got "${appUrl ?? ""}"). Telegram cannot reach localhost.`);
}

async function call(method, body) {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  const data = await response.json();
  if (!data.ok) fail(`${method} failed: ${data.description}`);
  return data.result;
}

const webhook = `${appUrl.replace(/\/$/, "")}/api/telegram`;

const bot = await call("getMe");
await call("setWebhook", {
  url: webhook,
  secret_token: secret,
  allowed_updates: ["message"],
  drop_pending_updates: true,
});
await call("setMyCommands", {
  commands: [
    { command: "list", description: "Today’s numbered list" },
    { command: "done", description: "Tick off tasks, e.g. /done 2" },
    { command: "undo", description: "Untick a task done today, e.g. /undo 2" },
    { command: "remove", description: "Take a task off the list, e.g. /remove 2" },
    { command: "help", description: "How to use this bot" },
  ],
});
const info = await call("getWebhookInfo");

console.log(`\n✓ @${bot.username} now delivers messages to ${info.url}`);
console.log("  Next: open the bot in Telegram and send /start.");
console.log("  If TELEGRAM_ALLOWED_CHAT_ID is not set yet, the bot will reply with your chat id.\n");
