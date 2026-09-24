-- Streak: app-wide settings, starting with the login password.
-- Run once in Supabase → SQL Editor, after 20260924000000_create_tasks.sql.

create table if not exists public.app_settings (
  -- Exactly one row: the primary key can only ever be true.
  id                boolean primary key default true check (id),
  -- scrypt hash of the password set from the Settings page. While this table is
  -- empty, the APP_PASSWORD environment variable is used instead.
  password_hash     text not null,
  -- Bumped on every change; login cookies carrying an older number stop working,
  -- which signs out every other device.
  password_version  integer not null default 1,
  updated_at        timestamptz not null default now()
);

alter table public.app_settings enable row level security;
