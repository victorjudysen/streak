-- Streak: daily tasks.
-- Run this once in Supabase → SQL Editor (or `supabase db push` if you use the CLI).

create table if not exists public.tasks (
  id          uuid primary key default gen_random_uuid(),
  -- Insertion order. Tasks sent in one message share created_at, so list numbers
  -- (used by Telegram's /done 2) are ordered by this instead.
  seq         bigint generated always as identity,
  title       text not null check (char_length(btrim(title)) between 1 and 280),
  -- The day the task was planned for, in Victor's time zone (STREAK_TIMEZONE).
  task_date   date not null,
  -- When it was completed. NULL means still open.
  done_at     timestamptz,
  -- When an unfinished task from an earlier day was let go. The row is kept so the
  -- record stays honest; it simply stops appearing on the daily list.
  dropped_at  timestamptz,
  source      text not null default 'app' check (source in ('app', 'telegram')),
  created_at  timestamptz not null default now()
);

create index if not exists tasks_task_date_idx on public.tasks (task_date);
create index if not exists tasks_done_at_idx on public.tasks (done_at) where done_at is not null;
create index if not exists tasks_open_idx on public.tasks (task_date) where done_at is null and dropped_at is null;

-- Telegram retries a webhook delivery if it does not get a quick answer. Remembering
-- each update id means a repeated delivery can never add the same task twice.
create table if not exists public.telegram_updates (
  update_id    bigint primary key,
  received_at  timestamptz not null default now()
);

-- Row Level Security on, with no policies: the publishable (public) key cannot read
-- or write anything. The Next.js server uses the secret key, which bypasses RLS.
alter table public.tasks enable row level security;
alter table public.telegram_updates enable row level security;
