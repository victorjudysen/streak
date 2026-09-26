# Next.js foundation

Source of truth for feature branches after `foundation/nextjs-supabase` is merged.
It replaces the Laravel foundation.

## Architecture

- **Next.js 16 App Router**, TypeScript, plain CSS (no Tailwind). Deployed as a
  Node app on Netlify (`streak-thisuncle`, https://streak.thisuncle.co.tz).
- **Supabase Postgres** is the only store. All reads and writes happen on the
  server with `SUPABASE_SECRET_KEY` (`src/lib/supabase.ts`). Row Level Security is
  enabled with no policies, so the publishable key alone can do nothing.
- **Single-user login**: a password plus a signed, httpOnly cookie
  (`src/lib/session.ts`). Pages call `requirePageSession()` (redirects to
  /login) and every server action calls `requireSession()`. There is no
  `proxy.ts`: Netlify's Next.js adapter (5.16.0) fails to build with one, and
  the per-page and per-action checks already cover every entry point.
- **Password storage** (`src/lib/credentials.ts`): `APP_PASSWORD` until the
  password is changed on /settings; after that, a scrypt hash in
  `app_settings` (single row). Each cookie carries the password version it was
  issued under, so a change signs out every other device. Deleting the row
  restores `APP_PASSWORD`. Real accounts arrive with Phase 3
  in the product goals; a `user_id` column is added to `tasks` at that point.
- **Telegram** delivers messages to `POST /api/telegram`. The request must carry
  `TELEGRAM_WEBHOOK_SECRET`, come from `TELEGRAM_ALLOWED_CHAT_ID`, and have an
  unseen `update_id` (recorded in `telegram_updates`) before anything changes.

## One data layer

`src/lib/tasks.ts` is the only code that touches the `tasks` table. The web app
(`src/app/actions.ts`) and the bot (`src/lib/telegram/handle.ts`) both call it, so
there is one source of truth. The rules it enforces live as pure, tested
functions in `src/lib/task-rules.ts`. New features that change task data must go
through these files, not query Supabase directly.

## Live updates

Every successful change in `src/lib/tasks.ts` calls `broadcastTasksChanged()`
(`src/lib/realtime.ts`), which sends a content-free `tasks-changed` signal
through Supabase Realtime (REST broadcast, secret key). The dashboard's
`LiveUpdates` component subscribes with the publishable key and calls
`router.refresh()`. The channel name is an HMAC of `SESSION_SECRET` and is only
rendered for signed-in pages. New code that changes task data must go through
`tasks.ts` so the signal is sent.

## Dashboard contract

- Desktop is a fixed viewport; the document never scrolls. Panels scroll inside.
- Below 780px the three panels become tabs (Today, Record, Streak) — never one long page.
- Shared header (`src/components/AppHeader.tsx`), footer (`src/app/layout.tsx`),
  and tokens (`src/app/globals.css`) are owned by the Lead Agent.
- The footer credit linking ThisUncle Technologies is required on every page.

## Shared-file boundary

Sub-agents may read but must not modify, and should flag needed changes instead:

- `src/app/layout.tsx`, `src/app/globals.css`, `src/components/AppHeader.tsx`
- `src/lib/tasks.ts`, `src/lib/realtime.ts`, `src/lib/task-rules.ts`, `src/lib/dates.ts`, `src/lib/session.ts`, `src/lib/credentials.ts`, `src/lib/password.ts`, `src/lib/supabase.ts`
- `supabase/migrations/*` (add new migrations; never edit applied ones)
- this document

## Deploys

`.github/workflows/deploy.yml` is the deploy path: checks on every PR and push to
`main`, preview deploys (`pr-<n>` alias) for PRs, production on merge. It uses the
`NETLIFY_AUTH_TOKEN` repo secret; app environment variables come from the Netlify
site. Don't pass `--context deploy-preview` to `netlify deploy` — the Next.js
plugin then fails with a 403 fetching site extensions.

## Scheduled jobs

Netlify scheduled functions live in `netlify/functions/` and only call app
endpoints under `/api/cron/*`, authenticated with `CRON_SECRET`, so all logic
stays in the Next.js app and its shared libraries. Schedules are cron strings in
UTC. Existing: `daily-digest` at 06:00 UTC (09:00 EAT) sends today's list to
Telegram.

## Database changes

Add a new timestamped file in `supabase/migrations/` and run it in the Supabase
SQL Editor (or `supabase db push`). Keep RLS enabled on every new table.
