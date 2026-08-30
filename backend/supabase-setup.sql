-- ————————————————————————————————————————————————————
-- SOMUN '26 — Supabase setup
-- Run this ONCE: Supabase dashboard → SQL Editor → paste → Run.
-- Creates the two tables the site talks to and locks them down
-- with row-level security.
-- ————————————————————————————————————————————————————

-- ── Registrations ──────────────────────────────────
create table if not exists public.registrations (
  id              bigint generated always as identity primary key,
  ref_code        text not null unique,
  full_name       text not null,
  email           text not null,
  phone           text,
  institution     text not null,
  grade_or_title  text,
  experience      text not null default 'novice',   -- novice | intermediate | experienced
  committee_pref1 text not null,
  committee_pref2 text,
  committee_pref3 text,
  portfolio       text,
  notes           text,
  created_at      timestamptz not null default now()
);

alter table public.registrations enable row level security;

-- anyone with the anon key may SUBMIT a registration…
drop policy if exists "anon can register" on public.registrations;
create policy "anon can register"
  on public.registrations for insert
  to anon
  with check (true);

-- …and nothing else. No select / update / delete policies on purpose:
-- applications are read from the Table Editor / dashboard only.

-- ── Resources (study guides, chairing reports, …) ──
create table if not exists public.resources (
  id         bigint generated always as identity primary key,
  committee  text,                    -- matches a committee acronym, e.g. "UNSC"
  category   text,                    -- guides | agenda | rules | …
  title      text,
  file_url   text not null,
  released   boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.resources enable row level security;

-- the public may only ever see rows marked released = true
drop policy if exists "public can read released resources" on public.resources;
create policy "public can read released resources"
  on public.resources for select
  to anon
  using (released = true);

-- ── Storage bucket for the actual files ────────────
-- Public bucket: secretariat uploads through the dashboard,
-- visitors download straight from the public URL.
insert into storage.buckets (id, name, public)
values ('resources', 'resources', true)
on conflict (id) do nothing;
