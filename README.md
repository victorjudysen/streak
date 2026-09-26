# Streak

Victor’s private daily list. Add tasks in the web app or by messaging a Telegram
bot; tick them off from either place. Both write to the same Supabase database,
and the dashboard shows a year of real activity.

Built with Next.js 16 (App Router), Supabase (Postgres), and plain CSS.

The long-term direction lives in [docs/product-goals.md](docs/product-goals.md);
the rules for building on this code live in [docs/foundation.md](docs/foundation.md).

## First-time setup

### 1. Create the database tables

Open the Supabase dashboard → **SQL Editor** → **New query**, paste the contents of
[`supabase/migrations/20260924000000_create_tasks.sql`](supabase/migrations/20260924000000_create_tasks.sql),
and click **Run**. It creates two tables: `tasks` and `telegram_updates`.
Then do the same with
[`20260924140000_create_app_settings.sql`](supabase/migrations/20260924140000_create_app_settings.sql),
which stores the password once you change it in the app.
Then [`20260926120000_create_routines.sql`](supabase/migrations/20260926120000_create_routines.sql),
which adds recurring tasks.

### 2. Fill in `.env.local`

`.env.local` already has the project URL, publishable key, and two generated
secrets. Add the values marked `TODO`:

| Variable | Where it comes from |
| --- | --- |
| `SUPABASE_SECRET_KEY` | Supabase → Project Settings → API Keys → **Secret keys** (starts `sb_secret_`). Server-only; never share it. |
| `APP_PASSWORD` | The starting password for signing in. Once you change it under Settings, the app’s own copy is used instead. |
| `TELEGRAM_BOT_TOKEN` | In Telegram, message **@BotFather**, send `/newbot`, follow the prompts. |
| `TELEGRAM_ALLOWED_CHAT_ID` | Leave empty for now — see step 5. |
| `APP_URL` | The public `https://` address once deployed (step 4). |

`.env.example` documents every variable and is safe to commit; `.env.local` is not.

### 3. Run it locally

```bash
npm install
npm run dev
```

Open <http://localhost:3000> and sign in with `APP_PASSWORD`.

### 4. Deploy (Netlify)

The app is the Netlify site **streak-thisuncle**, served at
<https://streak.thisuncle.co.tz> (DNS is managed by Netlify).

Deploys are automatic through GitHub Actions (see [Deploys](#deploys)). The
app's environment variables live on Netlify → Site configuration →
Environment variables; secret ones are set for the production,
deploy-preview and branch-deploy contexts. After changing a variable, re-run
the latest "Check and deploy" run on `main` (or run `netlify deploy --build --prod`
from this folder).

Telegram needs this public https address to deliver messages, so the bot only
works once the app is deployed.

### 5. Connect the Telegram bot

```bash
npm run telegram:setup
```

This registers `https://<APP_URL>/api/telegram` with Telegram. Then open your bot
in Telegram and send `/start`. Because `TELEGRAM_ALLOWED_CHAT_ID` is still empty,
the bot replies with your chat id. Add it as `TELEGRAM_ALLOWED_CHAT_ID` on Netlify
and in `.env.local`, then redeploy. From then on the bot answers only you.

## Deploys

[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) runs lint, tests,
a build and a type check on every pull request and every push to `main`, then:

| Event | Deploys to |
| --- | --- |
| Pull request | Preview: `https://pr-<number>--streak-thisuncle.netlify.app` (shown in the run summary) |
| Merge to `main` | Production: <https://streak.thisuncle.co.tz> |

Previews use the same environment variables as production, **including the real
database**, so tasks you change on a preview change your real list.

The workflow needs one GitHub secret, `NETLIFY_AUTH_TOKEN`:

1. Netlify → avatar → **User settings** → **Applications** → **Personal access tokens** → **New access token**. Name it `streak-github-actions` and pick an expiry.
2. Add it to the repo (the command prompts for the value, so it isn't saved in your shell history):
   ```bash
   gh secret set NETLIFY_AUTH_TOKEN
   ```
   or GitHub → repo → Settings → Secrets and variables → Actions → New repository secret.

When the token expires, create a new one and run the same command again.

## Changing your password

Open **Settings** (top of the page) and enter your current password and a new
one (at least 10 characters). The new password is stored as a scrypt hash in
Supabase’s `app_settings` table and replaces `APP_PASSWORD` from then on.
Changing it signs out every other device.

**Forgot it?** In Supabase → Table Editor, delete the single row in
`app_settings`. The app then falls back to `APP_PASSWORD` again.

## Using the bot

| Message | What happens |
| --- | --- |
| `Call the bank` | Adds a task for today. Several lines add several tasks. |
| `/list` | Today’s numbered list. |
| `/done 2` | Ticks off task 2. Also `/done 1 3`, `/done 2-4`, `/done all`. |
| `/undo 2` | Unticks task 2 — only if it was completed today. |
| `/remove 2` | Deletes a task added today, or lets go of an older unfinished one. |

## Routines (recurring tasks)

Open **Routines** to add something you do regularly, like “Morning prayers”
every day or “Gym” on Mon/Wed/Fri. On those days it appears on the list by
itself, marked **↻ Routine** in the app and 🔁 in Telegram, and you tick it off
the same way as any task.

- Today’s routine tasks are created the first time anything loads the list —
  the dashboard, the bot, or the 9am message — so they are always in the
  morning message.
- **Unfinished routines carry over** like other tasks, so a missed day shows up
  again next to that day’s copy (“From Fri 25 Sept”).
- Removing today’s routine task **skips it for today**; the routine carries on
  tomorrow.
- **Pause** stops a routine appearing until you resume it. **Remove** stops it
  for good but keeps its history.
- Each routine shows its streak: the scheduled days in a row it was completed.
  Days it isn’t scheduled for don’t break it.

## Morning message

Every day at **09:00 East Africa Time** the bot sends today’s list to your
Telegram chat, including anything carried over, numbered so you can reply
`/done 2` straight away. An empty list gets a short nudge instead.

- The schedule lives in [`netlify/functions/daily-digest.mts`](netlify/functions/daily-digest.mts)
  (`0 6 * * *` = 06:00 UTC = 09:00 EAT). It is a fixed UTC time: changing
  `STREAK_TIMEZONE` does not move it.
- It runs only on the live production site, never on previews.
- It calls `POST /api/cron/daily-digest`, which requires the `CRON_SECRET`
  environment variable. To send one now, e.g. to test:
  ```bash
  curl -X POST https://streak.thisuncle.co.tz/api/cron/daily-digest -H "authorization: Bearer $CRON_SECRET"
  ```

## How the rules work

- **Today** is decided in `STREAK_TIMEZONE`, not the server’s clock.
- Unfinished tasks from earlier days **carry over** to today’s list, labelled with their original date.
- **Closed days stay closed.** A completion recorded on an earlier day cannot be undone or removed, from the app or the bot.
- Letting go of an old unfinished task hides it from the list but keeps the row, so the record stays honest.
- The activity map, streak, and weekly numbers are calculated only from real completion times.
- The dashboard updates **live**: a task added or ticked off in Telegram (or on another device) appears within a second, without refreshing. The “Live” badge on the Today panel shows the connection; if it drops, the page catches up when you return to the tab.
- Editing a Telegram message you already sent does nothing. Send a new message instead.

## Scripts

```bash
npm run dev             # local development server
npm test                # unit tests (rules, dates, stats, bot commands, sessions)
npm run lint            # ESLint
npm run typecheck       # TypeScript
npm run build           # production build
npm run telegram:setup  # point the Telegram bot at APP_URL
```
