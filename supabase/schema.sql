-- ————————————————————————————————————————————————————————————————
-- SOMUN '26 — Supabase setup (run ONCE in the SQL Editor)
-- Creates: registrations + resources tables, row-security rules,
--          and the public `resources` storage bucket.
-- Safe to re-run (idempotent).
-- ————————————————————————————————————————————————————————————————

-- ————— registrations —————
-- One row per submitted wizard. The site (anon key) may INSERT only;
-- reading and updating (payments) happen with the service role inside
-- the edge functions, so visitor data stays private.
create table if not exists public.registrations (
  id               uuid primary key default gen_random_uuid(),
  created_at       timestamptz not null default now(),
  ref_code         text not null unique,
  full_name        text not null,
  email            text not null,
  phone            text not null,
  institution      text not null,
  grade_or_title   text,
  experience       text not null default 'novice'
                   check (experience in ('novice', 'intermediate', 'veteran')),
  committee_pref1  text,
  committee_pref2  text,
  committee_pref3  text,
  portfolio        text,
  notes            text,
  -- payments (Cashfree, via edge functions)
  payment_status   text not null default 'pending'
                   check (payment_status in ('pending', 'paid', 'failed')),
  amount           integer,
  cashfree_order_id text,
  paid_at          timestamptz
);

alter table public.registrations enable row level security;

drop policy if exists "anyone can submit a registration" on public.registrations;
create policy "anyone can submit a registration"
  on public.registrations
  for insert
  to anon
  with check (true);
-- deliberately NO anon select / update / delete policies.

-- ————— resources —————
-- Study guides / rulebook / handbook rows. A row is invisible to the
-- site until released = true; then its file_url unlocks the matching
-- card's Download button (category rows) or the guides index (committee rows).
create table if not exists public.resources (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  committee   text,        -- e.g. 'UNHRC' → unlocks that guides-index row
  category    text,        -- 'study-guides' | 'rules' | 'handbook' → unlocks a card
  title       text,
  released    boolean not null default false,
  file_url    text not null default ''
);

alter table public.resources enable row level security;

drop policy if exists "released resources are public" on public.resources;
create policy "released resources are public"
  on public.resources
  for select
  to anon
  using (released = true);

-- ————— storage: public bucket for guide PDFs —————
insert into storage.buckets (id, name, public)
values ('resources', 'resources', true)
on conflict (id) do nothing;

drop policy if exists "public can download released files" on storage.objects;
create policy "public can download released files"
  on storage.objects
  for select
  to anon
  using (bucket_id = 'resources');
-- uploads happen from the dashboard (service role), so no insert policy needed.
