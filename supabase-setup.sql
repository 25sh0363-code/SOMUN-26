-- ————————————————————————————————————————————————————————————————
-- SOMUN '26 — SUPABASE SETUP
-- Paste this whole file into Supabase → SQL Editor → Run.
-- Creates: registrations table, resources table, public storage bucket,
-- and the row-security rules that make the anon key safe to publish.
-- ————————————————————————————————————————————————————————————————

-- 1 ————————————————— REGISTRATIONS —————————————————
-- Every form submission inserts one row. The site generates the
-- SM26-XXXXX reference code; visitors can never read the table back.

create table if not exists public.registrations (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  ref_code        text not null unique,
  full_name       text not null,
  email           text not null,
  phone           text not null,
  institution     text not null,
  grade_or_title  text,
  experience      text not null default 'novice',
  committee_pref1 text not null,
  committee_pref2 text,
  committee_pref3 text,
  portfolio       text,
  accommodation   boolean not null default false,
  notes           text
);

alter table public.registrations enable row level security;

drop policy if exists "anyone can register" on public.registrations;
create policy "anyone can register"
  on public.registrations
  for insert
  to anon
  with check (true);

-- (intentionally NO select/update/delete policies for anon/authenticated —
--  registrations stay private to you in the Supabase dashboard)

-- 2 ————————————————— RESOURCES (study guides etc.) —————————————————
-- Add one row per document. When released = true, the file becomes a
-- live download on the site:
--   • committee = committee acronym ('UNHRC', 'DISEC', …) → unlocks that
--     row in the "Study Guides" index
--   • category  = one of 'study-guides' | 'rules' | 'brief' | 'handbook'
--     → unlocks a Download button on the matching archive card
--   • file_url  = the public Storage URL (see step 3)

create table if not exists public.resources (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  title       text not null,
  description text,
  category    text,
  committee   text,
  file_url    text not null,
  released    boolean not null default false,
  sort_order  int not null default 0
);

alter table public.resources enable row level security;

drop policy if exists "public reads released resources" on public.resources;
create policy "public reads released resources"
  on public.resources
  for select
  to anon
  using (released = true);

-- 3 ————————————————— STORAGE BUCKET —————————————————
-- Public bucket for the PDFs. Upload via Storage → resources → upload,
-- then copy a file's public URL into resources.file_url.

insert into storage.buckets (id, name, public)
values ('resources', 'resources', true)
on conflict (id) do nothing;

drop policy if exists "public read resources files" on storage.objects;
create policy "public read resources files"
  on storage.objects
  for select
  to anon
  using (bucket_id = 'resources');

-- Done. Now open js/config.js and paste your Project URL + anon key.
