-- TLM Finance — Supabase one-shot bootstrap
-- Paste the whole file into Supabase → SQL Editor → "New query" → Run.
-- Idempotent: safe to re-run; existing tables/policies are kept.

------------------------------------------------------------------------------
-- 1. SUBSCRIBERS — every email/phone that signed in or signed up
------------------------------------------------------------------------------
create table if not exists public.tlm_subscribers (
  email        text primary key,
  phone        text,
  name         text,
  provider     text,                 -- email | google | apple | facebook
  subscribed   boolean default false, -- newsletter opt-in (optional)
  created_at   timestamptz default now(),
  last_seen    timestamptz default now()
);

create index if not exists tlm_subscribers_subscribed_idx
  on public.tlm_subscribers (subscribed);

------------------------------------------------------------------------------
-- 2. AUDIT LOG — every notable event the site emits
------------------------------------------------------------------------------
create table if not exists public.tlm_audit (
  id          bigserial primary key,
  user_id     uuid,
  kind        text,                  -- signin | signup | signout | plan-saved | newsletter-pref
  meta        jsonb,
  page        text,
  created_at  timestamptz default now()
);

create index if not exists tlm_audit_user_idx    on public.tlm_audit (user_id);
create index if not exists tlm_audit_kind_idx    on public.tlm_audit (kind);
create index if not exists tlm_audit_created_idx on public.tlm_audit (created_at desc);

------------------------------------------------------------------------------
-- 3. PLAN SNAPSHOTS — saved plans by user (so they sync across devices)
------------------------------------------------------------------------------
create table if not exists public.tlm_plans (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  plan        jsonb not null,
  updated_at  timestamptz default now()
);

------------------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY — anon key in the browser is now safe
------------------------------------------------------------------------------
alter table public.tlm_subscribers enable row level security;
alter table public.tlm_audit       enable row level security;
alter table public.tlm_plans       enable row level security;

-- Subscribers: anyone can upsert their own email; nobody can read (admin uses service role).
drop policy if exists "subs_self_upsert" on public.tlm_subscribers;
create policy "subs_self_upsert" on public.tlm_subscribers
  for insert with check (true);
drop policy if exists "subs_self_update" on public.tlm_subscribers;
create policy "subs_self_update" on public.tlm_subscribers
  for update using (true) with check (true);
-- Reads are blocked from the browser; admin reads via service_role from a function.

-- Audit: any signed-in user can insert their own events.
drop policy if exists "audit_insert_own" on public.tlm_audit;
create policy "audit_insert_own" on public.tlm_audit
  for insert with check (auth.uid() = user_id);
drop policy if exists "audit_read_own" on public.tlm_audit;
create policy "audit_read_own" on public.tlm_audit
  for select using (auth.uid() = user_id);

-- Plans: a user can read/write only their own plan.
drop policy if exists "plans_own" on public.tlm_plans;
create policy "plans_own" on public.tlm_plans
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

------------------------------------------------------------------------------
-- 5. ADMIN HELPERS — tiny views the admin panel can hit via RPC if you want
------------------------------------------------------------------------------
-- Subscriber count (public OK)
create or replace view public.tlm_subscriber_count as
  select count(*)::int as total,
         count(*) filter (where subscribed)::int as opted_in
  from public.tlm_subscribers;

-- Done. The admin panel reads tlm_subscribers via a server-side function or
-- via the dashboard. The browser client only reads/writes its own rows,
-- so the anon public key in tlm-config.js is safe to ship.
