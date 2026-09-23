-- KIMO — Supabase schema
-- Run once in the Supabase dashboard: SQL Editor → New query → paste → Run.
--
-- One row per parent account holding the family's data as JSON.
-- Row Level Security: a signed-in user can only see and change their own row.

create table if not exists public.family_state (
  owner       uuid primary key references auth.users (id) on delete cascade default auth.uid(),
  state       jsonb not null,
  updated_at  timestamptz not null default now()
);

alter table public.family_state enable row level security;

drop policy if exists "owner can read"   on public.family_state;
drop policy if exists "owner can insert" on public.family_state;
drop policy if exists "owner can update" on public.family_state;

create policy "owner can read"   on public.family_state for select to authenticated using (owner = (select auth.uid()));
create policy "owner can insert" on public.family_state for insert to authenticated with check (owner = (select auth.uid()));
create policy "owner can update" on public.family_state for update to authenticated
  using (owner = (select auth.uid())) with check (owner = (select auth.uid()));

-- No delete policy: rows can't be deleted from the app.
-- Anonymous (not signed in) users get no access at all.
revoke all on public.family_state from anon;
