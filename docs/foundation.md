# Next.js foundation

Source of truth for feature branches after `foundation/nextjs-supabase` is merged.
It replaces the Laravel foundation.

## Architecture

- **Next.js 16 App Router**, TypeScript, plain CSS (no Tailwind). Deployed as a
  Node app (Vercel by default).
- **Supabase Postgres** is the only store. All reads and writes happen on the
  server with `SUPABASE_SECRET_KEY` (`src/lib/supabase.ts`). Row Level Security is
  enabled with no policies, so the publishable key alone can do nothing.
- **Single-user login**: `APP_PASSWORD` plus a signed, httpOnly cookie
  (`src/lib/session.ts`). `src/proxy.ts` redirects signed-out visitors; every
  server action calls `requireSession()` again. Real accounts arrive with Phase 3
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

## Dashboard contract

- Desktop is a fixed viewport; the document never scrolls. Panels scroll inside.
- Below 780px the three panels become tabs (Today, Record, Streak) — never one long page.
- Shared header (`src/components/AppHeader.tsx`), footer (`src/app/layout.tsx`),
  and tokens (`src/app/globals.css`) are owned by the Lead Agent.
- The footer credit linking ThisUncle Technologies is required on every page.

## Shared-file boundary

Sub-agents may read but must not modify, and should flag needed changes instead:

- `src/app/layout.tsx`, `src/app/globals.css`, `src/components/AppHeader.tsx`
- `src/lib/tasks.ts`, `src/lib/task-rules.ts`, `src/lib/dates.ts`, `src/lib/session.ts`, `src/lib/supabase.ts`
- `supabase/migrations/*` (add new migrations; never edit applied ones)
- this document

## Database changes

Add a new timestamped file in `supabase/migrations/` and run it in the Supabase
SQL Editor (or `supabase db push`). Keep RLS enabled on every new table.
