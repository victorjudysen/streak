-- Streak: recurring daily tasks ("routines").
-- Run once in Supabase → SQL Editor, after the earlier migrations.
-- Additive only: existing tasks and code keep working before and after.

create table if not exists public.routines (
  id           uuid primary key default gen_random_uuid(),
  seq          bigint generated always as identity,
  title        text not null check (char_length(btrim(title)) between 1 and 280),
  -- ISO weekdays the routine appears on: 1 = Monday … 7 = Sunday.
  weekdays     smallint[] not null default '{1,2,3,4,5,6,7}'
               check (cardinality(weekdays) between 1 and 7 and weekdays <@ '{1,2,3,4,5,6,7}'),
  -- Paused routines stop appearing until resumed.
  paused_at    timestamptz,
  -- Removed routines stop appearing for good; their past tasks are kept.
  archived_at  timestamptz,
  created_at   timestamptz not null default now()
);

alter table public.routines enable row level security;

-- Which routine a task was created from (NULL for one-off tasks).
alter table public.tasks
  add column if not exists routine_id uuid references public.routines(id) on delete set null;

-- One task per routine per day, so creating today's routine tasks is safe to repeat.
-- NULLs are distinct, so one-off tasks are unaffected.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'tasks_routine_day_key') then
    alter table public.tasks add constraint tasks_routine_day_key unique (routine_id, task_date);
  end if;
end $$;
