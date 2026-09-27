# Self-hosting Streak

This guide takes you from nothing to your own Streak at a public address, with a
Telegram bot that only answers you. It takes about 30 minutes.

**What you need**

- A GitHub account (to fork the code).
- A free [Supabase](https://supabase.com) project: the database.
- A free [Netlify](https://www.netlify.com) account: the hosting.
- Telegram, for the bot (optional; the web app works without it).
- On your computer: Node.js 22+, and the [Supabase CLI](https://supabase.com/docs/guides/cli)
  and [Netlify CLI](https://docs.netlify.com/cli/get-started/).

## 1. Fork and install

```bash
git clone https://github.com/<you>/streak.git
cd streak
npm install
cp .env.example .env.local
```

`.env.local` holds your settings and secrets. Git ignores it, so it's never
committed. Every variable is explained in [Settings](#settings) below.

## 2. Create the database

1. Create a project in Supabase. Any region works.
2. Link this folder to it and apply the migrations:

   ```bash
   supabase link --project-ref <your-project-ref>
   supabase db push --dry-run   # shows what will be created
   supabase db push
   ```

   The project ref is the `xxxx` in `https://xxxx.supabase.co`. If you'd rather
   not use the CLI, paste each file in `supabase/migrations/` into Supabase → SQL
   Editor, oldest first, and run it.

3. In Supabase → Project Settings → API Keys, copy into `.env.local`:
   - the project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - the **publishable** key → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - a **secret** key (starts `sb_secret_`) → `SUPABASE_SECRET_KEY`

   > If you fetch keys with `supabase projects api-keys`, add `--reveal`.
   > Without it the CLI prints a masked copy that looks real but won't work.

Row Level Security is on for every table with no policies. So the publishable
key, which is sent to browsers, can't read or write anything. The server does
all the reading and writing with the secret key.

## 3. Fill in the rest of `.env.local`

- `APP_PASSWORD`: the password you'll sign in with. You can change it later in
  the app.
- `SESSION_SECRET`, `TELEGRAM_WEBHOOK_SECRET` and `CRON_SECRET`: generate each with
  `openssl rand -hex 32`.
- `STREAK_TIMEZONE`: your time zone, e.g. `Europe/London`.
- `OWNER_NAME`: optional, shown as initials in the header.

Then run it:

```bash
npm run dev
```

Open <http://localhost:3000> and sign in.

## 4. Deploy to Netlify

```bash
netlify sites:create --name <your-site-name>
netlify env:import .env.local     # or add each variable in the Netlify UI
netlify deploy --build --prod
```

Set `APP_URL` to the resulting `https://` address, locally and on Netlify. Mark
the secret variables as **secret** in Netlify (Site configuration → Environment
variables).

> Don't pass `--context deploy-preview` to `netlify deploy`. With it, the
> Next.js plugin fails with a 403 while fetching site extensions.

### Automatic deploys (optional)

`.github/workflows/deploy.yml` runs the checks on every pull request and push. It
also deploys PR previews and production if you give it two things in your
fork's **Settings → Secrets and variables → Actions**:

- a **variable** `NETLIFY_SITE_ID` (from `netlify status`, or Netlify → Site
  configuration → Site ID);
- a **secret** `NETLIFY_AUTH_TOKEN`. Create it in Netlify → User settings →
  Applications → Personal access tokens, then run `gh secret set NETLIFY_AUTH_TOKEN`.

Without them, only the checks run. Previews use your production settings,
**including the real database**.

## 5. Connect the Telegram bot

1. In Telegram, message **@BotFather**, send `/newbot`, and follow the prompts.
   Put the token in `TELEGRAM_BOT_TOKEN`, locally and on Netlify, then redeploy.
2. Register the webhook and command menu:

   ```bash
   npm run telegram:setup
   ```

   This needs a network that can reach `api.telegram.org`. Some networks block
   it; a phone hotspot or VPN works around that.
3. Send `/start` to your bot. While `TELEGRAM_ALLOWED_CHAT_ID` is empty, the bot
   only replies with your chat id. Set that id on Netlify and redeploy. From then
   on the bot answers only you and ignores everyone else.

## 6. The morning message

A Netlify scheduled function (`netlify/functions/daily-digest.mts`) runs every
hour. The app sends today's list only when it's `DIGEST_HOUR` (default 9) in
`STREAK_TIMEZONE`, so it arrives at 9am local time, daylight saving included.
Scheduled functions only run on the published production deploy.

To send one immediately, e.g. to test:

```bash
curl -X POST "https://<your-site>/api/cron/daily-digest?now=1" -H "authorization: Bearer $CRON_SECRET"
```

## Settings

| Variable | Required | What it does |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Your Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | for live updates | Lets the browser listen for "tasks changed" signals. Can't read data. |
| `SUPABASE_SECRET_KEY` | yes | Server-only database key. Keep it secret. |
| `APP_PASSWORD` | yes | Starting sign-in password. |
| `SESSION_SECRET` | yes | Signs the login cookie. |
| `STREAK_TIMEZONE` | recommended | IANA time zone; default `UTC`. |
| `OWNER_NAME` | no | Your name, shown as initials. |
| `TELEGRAM_BOT_TOKEN` | for the bot | From @BotFather. |
| `TELEGRAM_WEBHOOK_SECRET` | for the bot | Proves requests really come from Telegram. |
| `TELEGRAM_ALLOWED_CHAT_ID` | for the bot | The only chat the bot answers. |
| `APP_URL` | for the bot | Your public `https://` address, used by `telegram:setup`. |
| `CRON_SECRET` | for the morning message | Protects `/api/cron/daily-digest`. |
| `DIGEST_HOUR` | no | Local hour for the morning message; default `9`. |
| `SOURCE_CODE_URL` | if you modify Streak | Where your version's source lives (see the AGPL). |

## Everyday maintenance

- **Changing your password:** Settings → Change password. The new password is
  stored as a scrypt hash in `app_settings` and replaces `APP_PASSWORD`; changing
  it signs out other devices. **Forgot it?** Delete the single row in
  `app_settings` (Supabase → Table Editor) and `APP_PASSWORD` works again.
- **Database changes:** add a new timestamped file to `supabase/migrations/`, then
  run `supabase db push --dry-run` and `supabase db push`. Never edit a
  migration that has already been applied.
- **Changing a setting on Netlify:** redeploy afterwards. Settings are read when
  the site is built and started.
