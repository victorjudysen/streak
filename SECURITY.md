# Security

Streak holds personal records, so security reports are taken seriously.

## Reporting a problem

**Please don't open a public issue for a security problem.** Report it privately
instead:

1. Go to the repository's **Security** tab.
2. Click **Report a vulnerability**.
3. Describe the problem, how to reproduce it, and what an attacker could do with
   it.

You'll get a reply within a week. Fixes are released as soon as they're ready,
and you'll be credited in the advisory unless you'd rather not be.

## What's in scope

- The web app: sign-in, sessions, server actions and API routes.
- The Telegram webhook and the scheduled morning-message endpoint.
- Anything that lets someone read or change another install's data, or bypass
  the "closed days stay closed" rule.

Problems in your own deployment's configuration, such as a weak `APP_PASSWORD`
or a leaked secret, aren't vulnerabilities in Streak. If you think the docs led
you into one, please report that too.

## If you run your own copy

- Keep `SUPABASE_SECRET_KEY`, `SESSION_SECRET`, `TELEGRAM_BOT_TOKEN`,
  `TELEGRAM_WEBHOOK_SECRET` and `CRON_SECRET` out of git. They belong in
  `.env.local` and your host's secret settings.
- Use a long password, and change it under Settings if it's ever been shared.
- Lock the bot to your chat with `TELEGRAM_ALLOWED_CHAT_ID`.
- If a secret leaks, rotate it: create a new one, update it everywhere, and
  redeploy. Changing `SESSION_SECRET` signs everyone out.
