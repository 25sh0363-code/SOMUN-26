-- ══════════════════════════════════════════════════════════════════════
   SOMUN '26 — PAYMENT LAYER (unique-amount watermark scheme)
   ══════════════════════════════════════════════════════════════════════
   How the scheme works:
   · Every registration is invoiced the base fee + a UNIQUE paise suffix
     (early bird ₹2799 → ₹2799.63 for one delegate, ₹2799.07 for the
     next). The paise ARE the payment's identity.
   · The delegate pays that exact amount (deep link / QR), submits the
     UTR + a screenshot of the UPI success screen.
   · An AI assistant (optional) reads the screenshot and cross-checks it
     against the invoiced amount / VPA / UTR — ADVISORY ONLY, it can
     never flip a row to paid.
   · The secretariat reconciles LATER: paste the bank statement lines
     into the console — every credit line auto-matches its registration
     by UTR first, then by its unique amount. One credit can only ever
     satisfy one registration: one payment cannot buy two seats, and a
     missing amount in the statement names exactly who didn't pay.
   · A live "sales meter" (invoiced vs confirmed) sits atop the console.

   INSTALL: paste this whole file into Supabase → SQL Editor → Run.
   It is IDEMPOTENT — run it once or fifty times; it upgrades in place.

   THEN fill the two marked lines in section 1 (payee VPA + console key).
   ══════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────
   0 · REGISTRATIONS — canonical payment columns (upgrade in place)
   ───────────────────────────────────────────────────────────── */

create table if not exists registrations (
  id               bigint generated always as identity primary key,
  created_at       timestamptz not null default now(),
  ref_code         text,
  full_name        text not null,
  email            text not null,
  phone            text,
  institution      text,
  grade_or_title   text,
  experience       text default 'novice',
  committee_pref1  text,
  committee_pref2  text,
  committee_pref3  text,
  portfolio        text,
  notes            text,
  allergies        text
);

alter table registrations add column if not exists tier             text not null default 'early';
alter table registrations add column if not exists fee_base         int;
alter table registrations add column if not exists expected_paise   int;
alter table registrations add column if not exists expected_amount  numeric(10,2);
alter table registrations add column if not exists upi_utr          text;
alter table registrations add column if not exists utr_submitted_at timestamptz;
alter table registrations add column if not exists declared_amount  numeric(10,2);
alter table registrations add column if not exists shot_path        text;
alter table registrations add column if not exists shot_check       jsonb;
alter table registrations add column if not exists payment_status   text not null default 'registered';
alter table registrations add column if not exists status_note      text;
alter table registrations add column if not exists paid_at          timestamptz;
alter table registrations add column if not exists paid_via         text;
alter table registrations add column if not exists allergies        text;

-- legacy rows (if any) get the current base fee stamped in
update registrations set fee_base = 2799 where fee_base is null;

alter table registrations drop constraint if exists registrations_payment_status_check;
alter table registrations add constraint registrations_payment_status_check
  check (payment_status in ('registered', 'verifying', 'paid', 'failed'));

-- identity indexes
create unique index if not exists registrations_ref_code_key
  on registrations (ref_code) where ref_code is not null;
create unique index if not exists registrations_utr_key
  on registrations (upper(upi_utr)) where coalesce(upi_utr, '') <> '';
-- the watermark lock: one live (unpaid) row per tier per paise suffix.
-- 'paid' rows free their suffix for reuse; UTR matching stays the
-- primary signal, so reuse across time is safe.
create unique index if not exists registrations_paise_live_key
  on registrations (tier, expected_paise)
  where expected_paise is not null
    and payment_status in ('registered', 'verifying');

-- ─────────────────────────────────────────────────────────────
   1 · APP SECRETS — the two lines YOU must fill
   ───────────────────────────────────────────────────────────── */

create table if not exists app_secrets (
  key   text primary key,
  value text not null default ''
);

insert into app_secrets (key, value) values
  ('admin_key',      'PASTE-A-LONG-RANDOM-KEY-HERE'),   -- console key (≥12 chars) — REPLACE
  ('payee_vpa',      'PASTE-YOUR-UPI-ID-HERE'),          -- e.g. 'somun26@ybl' — REPLACE
  ('payee_name',     'SOMUN ''26'),
  ('fee_base_early', '2799'),
  ('service_key',    'PASTE-YOUR-SERVICE-ROLE-KEY-HERE'), -- Dashboard → Settings → API → service_role — REPLACE
  ('project_url',    'PASTE-YOUR-PROJECT-URL-HERE'),      -- e.g. 'https://abcdefgh.supabase.co' — REPLACE
  ('jwt_secret',     'PASTE-YOUR-JWT-SECRET-HERE'),        -- Dashboard → Settings → API → JWT Secret — REPLACE
  ('gemini_api_key', 'PASTE-YOUR-GEMINI-API-KEY-HERE')     -- aistudio.google.com → Get API key — REPLACE
on conflict (key) do nothing;

-- ▼▼▼ FILL THESE VALUES: Table Editor → app_secrets, edit the cells ▼▼▼
--    admin_key + payee_vpa (as before), and now service_key + project_url
--    + jwt_secret so the console can open delegates' payment screenshots
--    (signed URLs, valid 1 hour — the private bucket stays sealed).
-- ▲▲▲ re-running this file NEVER overwrites a real value — the updates
--     only fire while a cell is still empty or still says PASTE-… ▲▲▲
update app_secrets set value = 'PASTE-YOUR-UPI-ID-HERE'
  where key = 'payee_vpa' and (value = '' or value like 'PASTE-%');
update app_secrets set value = 'PASTE-A-LONG-RANDOM-KEY-HERE'
  where key = 'admin_key' and (value = '' or value like 'PASTE-%');
update app_secrets set value = 'PASTE-YOUR-SERVICE-ROLE-KEY-HERE'
  where key = 'service_key' and (value = '' or value like 'PASTE-%');
update app_secrets set value = 'PASTE-YOUR-PROJECT-URL-HERE'
  where key = 'project_url' and (value = '' or value like 'PASTE-%');
update app_secrets set value = 'PASTE-YOUR-JWT-SECRET-HERE'
  where key = 'jwt_secret' and (value = '' or value like 'PASTE-%');
update app_secrets set value = 'PASTE-YOUR-GEMINI-API-KEY-HERE'
  where key = 'gemini_api_key' and (value = '' or value like 'PASTE-%');

-- ─────────────────────────────────────────────────────────────
   2 · ROW SECURITY
   ───────────────────────────────────────────────────────────── */

alter table app_secrets  enable row level security;
-- no policies: the VPA/admin key stay invisible to anon+authenticated.
-- RPCs read this table as the definer (owner), which bypasses RLS.

alter table registrations enable row level security;
drop policy if exists regs_anon_insert on registrations;
create policy regs_anon_insert on registrations
  for insert to anon
  with check (
    payment_status = 'registered'
    and upi_utr is null and paid_at is null and paid_via is null
    and expected_paise is null and expected_amount is null
    and shot_path is null and utr_submitted_at is null
  );
-- no SELECT/UPDATE policies for anon: the public can push a row in
-- (legacy path) but can never read or mutate anyone's registration.
-- Every read/write beyond this runs through the SECURITY DEFINER RPCs
-- below or the service-role dashboard.

create table if not exists credits (
  id          bigint generated always as identity primary key,
  recv_at     timestamptz not null default now(),
  src         text not null default 'manual',
  sender      text,
  body        text not null,
  amount_inr  numeric(10,2),
  utr         text,
  consumed_by text,
  ignored     boolean not null default false
);
alter table credits enable row level security;
-- no policies at all: reachable only via the guarded RPCs

create table if not exists mail_queue (
  id              bigint generated always as identity primary key,
  registration_id text,
  to_email        text not null,
  template        text not null default 'payment_verified',
  created_at      timestamptz not null default now(),
  sent_at         timestamptz,
  attempts        int not null default 0
);
alter table mail_queue enable row level security;
-- no policies: guarded RPCs only. Delivery wiring (Database Webhook →
-- mailer) is optional and documented in supabase/PAYMENTS.md — until
-- then the console's mail panel is the outbox the secretariat works.

-- private bucket for payment screenshots (anon may push, never read)
insert into storage.buckets (id, name, public)
values ('payment-shots', 'payment-shots', false)
on conflict (id) do nothing;
drop policy if exists shots_anon_put on storage.objects;
create policy shots_anon_put on storage.objects
  for insert to anon
  with check (bucket_id = 'payment-shots');

-- ─────────────────────────────────────────────────────────────
   3 · HELPERS
   ───────────────────────────────────────────────────────────── */

create or replace function somun_fee_base(p_tier text)
returns int language sql stable security definer set search_path = public as $$
  select coalesce(
    nullif((select value from app_secrets where key = 'fee_base_' || p_tier), '')::int,
    0)
$$;

-- a statement/SMS line only counts if it smells like a CREDIT
create or replace function somun_line_is_credit(p_line text)
returns boolean language sql immutable as $$
  select lower(p_line) ~ '(credited|received|deposited|added to|cr[/: ]|/cr/)'
$$;

-- flip a row to paid exactly once; queue the confirmation mail
create or replace function somun_flip_paid(p_reg_id registrations.id%TYPE, p_via text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update registrations
     set payment_status = 'paid', paid_at = now(), paid_via = p_via
   where id = p_reg_id and payment_status <> 'paid';
  if found then
    insert into mail_queue (registration_id, to_email)
    select p_reg_id::text, r.email from registrations r
     where r.id = p_reg_id
       and not exists (select 1 from mail_queue m
                        where m.registration_id = p_reg_id::text and m.sent_at is null);
  end if;
end $$;

-- guard shared by every console RPC
create or replace function somun_guard(p_key text)
returns void language plpgsql security definer set search_path = public as $$
declare v_key text;
begin
  v_key := coalesce(nullif((select value from app_secrets where key = 'admin_key'), ''), '');
  if v_key = '' then
    raise exception 'The console key is not set yet — fill the admin_key line in supabase/payment.sql (section 1).';
  end if;
  if p_key is null or p_key <> v_key then
    raise exception 'Invalid console key.';
  end if;
end $$;

-- ─────────────────────────────────────────────────────────────
   4 · REGISTRATION DOOR — validates, stamps the unique invoice
   ───────────────────────────────────────────────────────────── */

create or replace function register_delegate(
  p_ref_code      text default null,
  p_full_name     text default null,
  p_email         text default null,
  p_phone         text default null,
  p_institution   text default null,
  p_grade_or_title text default null,
  p_experience    text default 'novice',
  p_pref1         text default null,
  p_pref2         text default null,
  p_pref3         text default null,
  p_portfolio     text default null,
  p_allergies     text default null,
  p_notes         text default null
) returns json
language plpgsql security definer set search_path = public as $$
declare
  v_ref text; v_base int; v_paise int := null; v_try int;
  v_vpa text; v_name text; v_id registrations.id%TYPE;
  v_alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
begin
  p_full_name   := nullif(trim(coalesce(p_full_name, '')), '');
  p_email       := lower(nullif(trim(coalesce(p_email, '')), ''));
  p_phone       := nullif(trim(coalesce(p_phone, '')), '');
  p_institution := nullif(trim(coalesce(p_institution, '')), '');
  p_pref1       := nullif(trim(coalesce(p_pref1, '')), '');
  p_portfolio   := nullif(trim(coalesce(p_portfolio, '')), '');
  p_allergies   := nullif(trim(coalesce(p_allergies, '')), '');
  p_notes       := nullif(trim(coalesce(p_notes, '')), '');

  if p_full_name is null or length(p_full_name) < 3 then
    raise exception 'Please share your full name.';
  end if;
  if p_email is null or p_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'That email doesn''t look right — please check it.';
  end if;
  if p_phone is null or length(regexp_replace(p_phone, '\D', '', 'g')) < 8 then
    raise exception 'Please enter a valid phone number.';
  end if;
  if p_institution is null then
    raise exception 'Institution / organisation is required.';
  end if;
  if p_pref1 is null then
    raise exception 'Please choose at least one committee preference.';
  end if;
  if p_portfolio is null then
    raise exception 'Please enter your preferred country / portfolio — browse the allocation matrix if you''re unsure.';
  end if;

  -- deconflict the client's reference code (or mint a fresh one)
  v_ref := upper(nullif(trim(coalesce(p_ref_code, '')), ''));
  if v_ref is null
     or v_ref !~ '^SM26-[A-Z0-9]{5}$'
     or exists (select 1 from registrations r where r.ref_code = v_ref) then
    v_try := 0;
    loop
      v_try := v_try + 1;
      v_ref := 'SM26-' || (select string_agg(
                 substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::int, 1), '')
                 from generate_series(1, 5));
      exit when not exists (select 1 from registrations r where r.ref_code = v_ref)
             or v_try >= 7;
    end loop;
  end if;

  v_base := somun_fee_base('early');
  v_vpa  := nullif((select value from app_secrets where key = 'payee_vpa'), '');
  v_name := coalesce(nullif((select value from app_secrets where key = 'payee_name'), ''), 'SOMUN ''26');

  if v_base > 0 then
    -- allocate the unique paise watermark: 1..99, random pick, scoped to
    -- live (unpaid) rows of this tier. Retry on the rare race — the
    -- partial unique index is the referee.
    for v_try in 1..7 loop
      begin
        select i into v_paise
          from generate_series(1, 99) i
         where not exists (
           select 1 from registrations r
            where r.tier = 'early' and r.expected_paise = i
              and r.payment_status in ('registered', 'verifying'))
         order by random() limit 1;
        if v_paise is null then
          raise exception 'The early-bird payment desk is at capacity (99 live invoices) — please retry shortly or write to the secretariat.';
        end if;

        insert into registrations
          (ref_code, full_name, email, phone, institution, grade_or_title,
           experience, committee_pref1, committee_pref2, committee_pref3,
           portfolio, allergies, notes, tier, fee_base, expected_paise, expected_amount,
           payment_status)
        values
          (v_ref, p_full_name, p_email, p_phone, p_institution, p_grade_or_title,
           coalesce(p_experience, 'novice'), p_pref1, p_pref2, p_pref3,
           p_portfolio, p_allergies, p_notes, 'early', v_base, v_paise,
           v_base + v_paise / 100.0, 'registered')
        returning id into v_id;
        exit;
      exception when unique_violation then
        v_paise := null;   -- someone grabbed the suffix mid-flight — re-pick
      end;
    end loop;
    if v_paise is null then
      raise exception 'Could not allocate a payment slot — please retry in a moment.';
    end if;
  else
    -- fee not announced yet: register cleanly, no invoice
    insert into registrations
      (ref_code, full_name, email, phone, institution, grade_or_title,
       experience, committee_pref1, committee_pref2, committee_pref3,
       portfolio, allergies, notes, tier, fee_base, payment_status)
    values
      (v_ref, p_full_name, p_email, p_phone, p_institution, p_grade_or_title,
       coalesce(p_experience, 'novice'), p_pref1, p_pref2, p_pref3,
       p_portfolio, p_allergies, p_notes, 'early', null, 'registered')
    returning id into v_id;
  end if;

  return json_build_object(
    'ref_code', v_ref,
    'id',       v_id::text,
    'invoice', case when v_base > 0 and v_paise is not null then
      json_build_object(
        'tier', 'early',
        'base', v_base,
        'paise', v_paise,
        'amount', v_base + v_paise / 100.0,
        'vpa', v_vpa,
        'payee_name', v_name)
    else null end);
end $$;

-- ─────────────────────────────────────────────────────────────
   5 · UTR DESK — the delegate declares their transaction
   ───────────────────────────────────────────────────────────── */

create or replace function submit_payment_utr(
  p_ref_code  text,
  p_utr       text,
  p_amount    numeric default null,
  p_shot_path text default null
) returns json
language plpgsql security definer set search_path = public as $$
declare
  v registrations%ROWTYPE;
  v_utr text; v_note text;
begin
  select * into v from registrations
   where ref_code = upper(nullif(trim(coalesce(p_ref_code, '')), ''));
  if not found then
    raise exception 'No registration found for that reference code — it looks like SM26-XXXXX and is on your confirmation screen.';
  end if;

  if v.payment_status = 'paid' then
    return json_build_object('status', 'paid', 'expected_amount', v.expected_amount);
  end if;

  v_utr := upper(regexp_replace(coalesce(p_utr, ''), '\s', '', 'g'));
  if v_utr !~ '^[A-Z0-9]{10,16}$' then
    raise exception 'That doesn''t look like a UPI transaction ID — it is usually the 12-digit UTR shown under transaction details in your UPI app.';
  end if;
  if exists (select 1 from registrations r
              where upper(r.upi_utr) = v_utr and r.id is distinct from v.id) then
    raise exception 'This transaction ID is already used by another registration — every UPI payment has its own ID. Please enter the UTR from YOUR payment receipt.';
  end if;

  if coalesce(p_shot_path, '') = '' and coalesce(v.shot_path, '') = '' then
    raise exception 'The payment screenshot is required — attach the UPI success screen before submitting.';
  end if;

  if p_amount is not null and v.expected_amount is not null
     and abs(p_amount - v.expected_amount) > 0.004 then
    v_note := 'declared ₹' || p_amount::text || ' vs invoice ₹' || v.expected_amount::text;
  end if;

  begin
    update registrations
       set upi_utr = v_utr,
           utr_submitted_at = now(),
           declared_amount  = p_amount,
           shot_path        = coalesce(p_shot_path, shot_path),
           shot_check       = case when p_shot_path is not null
                                    and p_shot_path is distinct from shot_path
                                   then null else shot_check end,
           payment_status   = 'verifying',
           status_note      = v_note,
           paid_at = null, paid_via = null
     where id = v.id;
  exception when unique_violation then
    raise exception 'This transaction ID is already used by another registration — every UPI payment has its own ID. Please enter the UTR from YOUR payment receipt.';
  end;

  return json_build_object('status', 'verifying',
                           'expected_amount', v.expected_amount,
                           'shot_path', coalesce(p_shot_path, v.shot_path));
end $$;

-- ─────────────────────────────────────────────────────────────
   6 · DELEGATE STATUS LOOKUP (ref code + email pair)
   ───────────────────────────────────────────────────────────── */

create or replace function payment_status(p_ref_code text, p_email text)
returns json
language plpgsql security definer set search_path = public as $$
declare v registrations%ROWTYPE;
begin
  select * into v from registrations
   where ref_code = upper(nullif(trim(coalesce(p_ref_code, '')), ''))
     and email = lower(nullif(trim(coalesce(p_email, '')), ''));
  if not found then
    raise exception 'Nothing registered under that reference code + email pair — double-check both (the code is on your confirmation screen).';
  end if;
  return json_build_object(
    'status',          v.payment_status,
    'utr_set',         v.upi_utr is not null,
    'expected_amount', v.expected_amount,
    'paid_at',         v.paid_at,
    'status_note',     v.status_note);
end $$;

-- ─────────────────────────────────────────────────────────────
   7 · STATEMENT INGEST — paste bank lines, auto-match by watermark
       Priority: UTR match first, then the UNIQUE amount (which must be
       held by EXACTLY ONE live row to count). A credit can only ever
       satisfy one registration.
   ───────────────────────────────────────────────────────────── */

create or replace function ingest_credit(
  p_key  text,
  p_body text,
  p_src  text default 'manual'
) returns json
language plpgsql security definer set search_path = public as $$
declare
  v_lines text[]; v_line text; v_clean text;
  v_amt numeric; v_utr text; v_credit credits.id%TYPE;
  v_reg registrations.id%TYPE; v_n int;
  v_ingested int := 0; v_matched int := 0;
begin
  perform somun_guard(p_key);
  if nullif(trim(coalesce(p_body, '')), '') is null then
    raise exception 'Nothing to ingest — paste the statement lines first.';
  end if;

  v_lines := string_to_array(replace(p_body, chr(13), ''), chr(10));
  foreach v_line in array v_lines loop
    v_line := btrim(v_line);
    continue when length(v_line) < 4;
    continue when not somun_line_is_credit(v_line);

    v_clean := regexp_replace(v_line, ',', '', 'g');
    v_amt   := null; v_utr := null; v_reg := null;

    -- amount: prefer a currency-marked figure, fall back to any paise-
    -- exact figure (an invoice amount always carries .XX paise)
    v_amt := nullif(substring(v_clean from '(?:₹|rs\.?\s?|inr\s?)([0-9]+(?:\.[0-9]{1,2})?)'), '')::numeric;
    if v_amt is null then
      v_amt := nullif(substring(v_clean from '\m([0-9]{2,7}\.[0-9]{2})\M'), '')::numeric;
    end if;
    -- UTR: a standalone 12-digit number (UPI's classic UTR shape)
    v_utr := upper(substring(v_clean from '\m([0-9]{12})\M'));

    if v_amt is null and v_utr is null then
      continue;   -- nothing identifiable on this line
    end if;

    insert into credits (body, src, amount_inr, utr)
    values (v_line, p_src, v_amt, v_utr)
    returning id into v_credit;
    v_ingested := v_ingested + 1;

    -- match 1 · by UTR (decisive)
    if v_utr is not null then
      select id into v_reg from registrations
       where upper(upi_utr) = v_utr and payment_status = 'verifying'
       limit 1;
    end if;
    -- match 2 · by the unique amount — only when EXACTLY ONE live row
    -- holds it (the watermark normally guarantees this)
    if v_reg is null and v_amt is not null then
      select count(*), min(id) into v_n, v_reg
        from registrations
       where expected_amount = v_amt and expected_paise is not null
         and payment_status in ('registered', 'verifying');
      if v_n is distinct from 1 then
        v_reg := null;
      end if;
    end if;

    if v_reg is not null then
      perform somun_flip_paid(v_reg, 'feed·amount');
      update credits set consumed_by = v_reg::text where id = v_credit;
      v_matched := v_matched + 1;
    end if;
  end loop;

  return json_build_object('ingested', v_ingested, 'matched', v_matched);
end $$;

-- ─────────────────────────────────────────────────────────────
   8 · CONSOLE — overview (stats + sales meter + lists)
   ───────────────────────────────────────────────────────────── */

create or replace function pay_admin_overview(p_key text)
returns json
language plpgsql security definer set search_path = public as $$
begin
  perform somun_guard(p_key);

  return json_build_object(
    'stats', json_build_object(
      'pending_utr',    (select count(*) from registrations where payment_status = 'verifying'),
      'pending_no_utr', (select count(*) from registrations where payment_status = 'registered'),
      'paid',           (select count(*) from registrations where payment_status = 'paid'),
      'failed',         (select count(*) from registrations where payment_status = 'failed'),
      'unmatched',      (select count(*) from credits where consumed_by is null and not ignored),
      'mail_waiting',   (select count(*) from mail_queue where sent_at is null)),
    'totals', json_build_object(
      'invoiced',   (select coalesce(sum(expected_amount), 0) from registrations
                      where payment_status in ('registered', 'verifying', 'paid')),
      'confirmed',  (select coalesce(sum(expected_amount), 0) from registrations
                      where payment_status = 'paid'),
      'live_count', (select count(*) from registrations
                      where payment_status in ('registered', 'verifying', 'paid')),
      'paid_count', (select count(*) from registrations where payment_status = 'paid'),
      'ai_matched', (select count(*) from registrations
                      where payment_status = 'verifying'
                        and shot_check->'verdict'->>'consistency' = 'match')),
    'pending', coalesce((
      select json_agg(x) from (
        select id::text, ref_code, full_name, email, phone, institution,
               committee_pref1, committee_pref2, committee_pref3, portfolio,
               allergies, declared_amount as amount, expected_amount, upi_utr,
               utr_submitted_at, status_note, shot_path, shot_check
          from registrations
         where payment_status = 'verifying'
         order by utr_submitted_at desc nulls last
         limit 100) x), json_build_array()),
    'no_utr', coalesce((
      select json_agg(x) from (
        select id::text, ref_code, full_name, institution,
               expected_amount, created_at
          from registrations
         where payment_status = 'registered'
         order by created_at desc
         limit 100) x), json_build_array()),
    'credits', coalesce((
      select json_agg(x) from (
        select id::text, recv_at, src, sender, body, amount_inr, utr,
               consumed_by::text, ignored
          from credits
         order by recv_at desc
         limit 50) x), json_build_array()),
    'mail', coalesce((
      select json_agg(x) from (
        select m.id::text, m.registration_id, m.to_email,
               m.created_at, m.sent_at, r.full_name
          from mail_queue m
          left join registrations r on r.id::text = m.registration_id
         order by m.sent_at nulls first, m.created_at desc
         limit 30) x), json_build_array()),
    'paid_recent', coalesce((
      select json_agg(x) from (
        select id::text, ref_code, full_name, expected_amount as amount,
               upi_utr, paid_at, paid_via, shot_path
          from registrations
         where payment_status = 'paid'
         order by paid_at desc
         limit 20) x), json_build_array()),
    'rejected_recent', coalesce((
      select json_agg(x) from (
        select id::text, ref_code, full_name, email,
               expected_amount as amount, upi_utr,
               status_note, utr_submitted_at, shot_path
          from registrations
         where payment_status = 'failed'
         order by utr_submitted_at desc nulls last
         limit 20) x), json_build_array()));
end $$;

-- ─────────────────────────────────────────────────────────────
   8b · CONSOLE — search a book (pending / paid / rejected) by
        name, ref code, email or UTR — case-insensitive contains
   ───────────────────────────────────────────────────────────── */

create or replace function pay_admin_search(p_key text, p_book text, p_query text)
returns json
language plpgsql stable security definer set search_path = public as $$
declare
  v_q text;
begin
  perform somun_guard(p_key);
  v_q := '%' || replace(replace(trim(coalesce(p_query, '')), '%', '\%'), '_', '\_') || '%';

  if p_book = 'pending' then
    return coalesce((
      select json_agg(x) from (
        select id::text, ref_code, full_name, email, phone, institution,
               committee_pref1, committee_pref2, committee_pref3, portfolio,
               allergies, declared_amount as amount, expected_amount, upi_utr,
               utr_submitted_at, status_note, shot_path, shot_check
          from registrations
         where payment_status = 'verifying'
           and (full_name ilike v_q or ref_code ilike v_q
                or email ilike v_q or coalesce(upi_utr, '') ilike v_q)
         order by utr_submitted_at desc nulls last
         limit 50) x), json_build_array());
  elsif p_book = 'paid' then
    return coalesce((
      select json_agg(x) from (
        select id::text, ref_code, full_name, email,
               expected_amount as amount, upi_utr,
               paid_at, paid_via, shot_path
          from registrations
         where payment_status = 'paid'
           and (full_name ilike v_q or ref_code ilike v_q
                or email ilike v_q or coalesce(upi_utr, '') ilike v_q)
         order by paid_at desc
         limit 50) x), json_build_array());
  elsif p_book = 'rejected' then
    return coalesce((
      select json_agg(x) from (
        select id::text, ref_code, full_name, email,
               expected_amount as amount, upi_utr,
               status_note, utr_submitted_at, shot_path
          from registrations
         where payment_status = 'failed'
           and (full_name ilike v_q or ref_code ilike v_q
                or email ilike v_q or coalesce(upi_utr, '') ilike v_q)
         order by utr_submitted_at desc nulls last
         limit 50) x), json_build_array());
  end if;

  raise exception 'Unknown book — pending, paid or rejected.';
end $$;

-- ─────────────────────────────────────────────────────────────
   9 · CONSOLE — actions (verify / reject / revert / bind / requeue)
   ───────────────────────────────────────────────────────────── */

create or replace function pay_admin_decide(
  p_key text, p_registration text, p_action text, p_note text default null
) returns void
language plpgsql security definer set search_path = public as $$
declare v_id registrations.id%TYPE;
begin
  perform somun_guard(p_key);
  select id into v_id from registrations where id::text = p_registration;
  if not found then raise exception 'Registration not found.'; end if;

  if p_action = 'paid' then
    perform somun_flip_paid(v_id, 'manual');
    if coalesce(p_note, '') <> '' then
      update registrations set status_note = p_note where id = v_id;
    end if;
  elsif p_action = 'failed' then
    update registrations
       set payment_status = 'failed',
           status_note = coalesce(nullif(p_note, ''), status_note)
     where id = v_id;
    delete from mail_queue
     where registration_id = v_id::text
       and template = 'payment_rejected'
       and sent_at is null;
    insert into mail_queue (registration_id, to_email, template)
    select v_id::text, r.email, 'payment_rejected'
      from registrations r
     where r.id = v_id;
  elsif p_action = 'pending' then
    update registrations
       set payment_status = case when upi_utr is not null then 'verifying' else 'registered' end,
           paid_at = null, paid_via = null,
           status_note = case when payment_status = 'failed' then null else status_note end
     where id = v_id;
    delete from mail_queue where registration_id = v_id::text and sent_at is null;
  else
    raise exception 'Unknown action.';
  end if;
end $$;

create or replace function pay_admin_bind(
  p_key text, p_credit text, p_registration text
) returns void
language plpgsql security definer set search_path = public as $$
declare v_id registrations.id%TYPE; v_credit credits.id%TYPE;
begin
  perform somun_guard(p_key);
  select id into v_id from registrations where id::text = p_registration;
  if not found then raise exception 'Registration not found.'; end if;
  select id into v_credit from credits where id::text = p_credit;
  if not found then raise exception 'Credit not found.'; end if;

  perform somun_flip_paid(v_id, 'feed·bind');
  update credits set consumed_by = v_id::text where id = v_credit;
end $$;

create or replace function pay_admin_ignore(
  p_key text, p_credit text, p_ignore boolean default true
) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform somun_guard(p_key);
  update credits set ignored = p_ignore where id::text = p_credit;
end $$;

create or replace function pay_admin_requeue(p_key text, p_registration text)
returns void
language plpgsql security definer set search_path = public as $$
declare v_id registrations.id%TYPE; v_email text;
begin
  perform somun_guard(p_key);
  select id, email into v_id, v_email from registrations where id::text = p_registration;
  if not found then raise exception 'Registration not found.'; end if;

  update mail_queue set sent_at = null, attempts = 0
   where registration_id = v_id::text and sent_at is not null
     and created_at = (select max(created_at) from mail_queue
                        where registration_id = v_id::text);
  if not exists (select 1 from mail_queue where registration_id = v_id::text and sent_at is null) then
    insert into mail_queue (registration_id, to_email) values (v_id::text, v_email);
  end if;
end $$;

-- ─────────────────────────────────────────────────────────────
   9b · CONSOLE — open a delegate's payment screenshot
       The bucket is private (anon can push, never read) — the console
       gets a 1-hour signed URL. Primary route needs NO extension at all:
       a storage token is just an HS256 JWT, so pgcrypto signs it right
       here with app_secrets.jwt_secret (Settings → API → JWT Secret).
       No jwt_secret yet? Fallback: the `http` extension asks storage to
       sign, with http_post's real schema resolved from pg_proc — found
       wherever the extension happens to live, never guessed.
   ───────────────────────────────────────────────────────────── */

create extension if not exists pgcrypto;

do $$ begin
  if not exists (select 1 from pg_extension where extname = 'http') then
    create schema if not exists extensions;
    execute 'create extension http with schema extensions';
  end if;
exception when others then
  null;
end $$;

create or replace function pay_admin_shot_url(p_key text, p_registration text)
returns text
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_path   text;
  v_skey   text;
  v_base   text;
  v_jsec   text;
  v_hdr    text;
  v_pl     text;
  v_sig    text;
  v_ext    text;
  v_get    text;
  v_sign   text;
  v_status int;
  v_body   jsonb;
  v_url    text;
  v_r2     text;
begin
  perform somun_guard(p_key);
  select shot_path into v_path from registrations where id::text = p_registration;
  if not found then raise exception 'Registration not found.'; end if;
  if coalesce(v_path, '') = '' then
    raise exception 'No screenshot on this row yet.';
  end if;
  v_base := nullif((select value from app_secrets where key = 'project_url'), '');
  if v_base is null or v_base like 'PASTE-%' then
    raise exception 'Screenshot viewing is not configured yet — fill project_url in app_secrets (Dashboard → Settings → API).';
  end if;
  v_skey := nullif((select value from app_secrets where key = 'service_key'), '');
  v_jsec := nullif((select value from app_secrets where key = 'jwt_secret'), '');

  v_ext := (select n.nspname from pg_proc p
              join pg_namespace n on n.oid = p.pronamespace
             where p.proname = 'http_post'
             order by n.nspname <> 'extensions', n.nspname
             limit 1);
  v_get := (select n.nspname from pg_proc p
              join pg_namespace n on n.oid = p.pronamespace
             where p.proname = 'http_get'
             order by n.nspname <> 'extensions', n.nspname
             limit 1);

  if v_ext is null then
    v_r2 := 'the http extension is not installed';
  elsif v_skey is null or v_skey like 'PASTE-%' then
    v_r2 := 'the service_key row is still empty or a placeholder';
  else
    v_sign := trim(trailing '/' from v_base)
            || '/storage/v1/object/sign/payment-shots/' || v_path;
    begin
      execute format(
        'select s.status, convert_from(s.content, ''utf8'')::jsonb
           from %I.http_post(%L, %L, %L, array[%I.http_header(''Authorization'', %L)]) s',
        v_ext, v_sign, '{"expiresIn": 3600}', 'application/json', v_ext, 'Bearer ' || v_skey
      ) into v_status, v_body;
    exception
      when undefined_function or undefined_object
           or wrong_object_type or invalid_schema_name then
        begin
          execute format(
            'select s.status, convert_from(s.content, ''utf8'')::jsonb
               from %I.http(%L, %L, %L, %L, array[%I.http_header(''Authorization'', %L)]) s',
            v_ext, 'POST', v_sign, '{"expiresIn": 3600}', 'application/json', v_ext, 'Bearer ' || v_skey
          ) into v_status, v_body;
        exception when others then
          v_r2 := sqlerrm;
        end;
      when others then
        v_r2 := sqlerrm;
    end;

    if v_status = 200 and v_body->>'signedURL' is not null then
      return trim(trailing '/' from v_base) || (v_body->>'signedURL');
    elsif v_status is not null then
      v_r2 := 'storage answered ' || v_status::text
              || coalesce(' — ' || nullif(v_body->>'message', ''), '')
              || ' (is service_key the service_role key?)';
    elsif v_r2 is null then
      v_r2 := 'storage did not answer the sign request';
    end if;
  end if;

  if v_jsec is not null and v_jsec not like 'PASTE-%' then
    v_hdr := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
    v_pl  := translate(replace(encode(convert_to(json_build_object(
                 'url', 'payment-shots/' || v_path,
                 'iat', extract(epoch from now())::bigint,
                 'exp', extract(epoch from now())::bigint + 3600)::text,
                 'utf8'), 'base64'), chr(10), ''), '+/', '-_');
    v_pl  := rtrim(v_pl, '=');
    v_sig := translate(replace(encode(hmac(v_hdr || '.' || v_pl, v_jsec, 'sha256'),
                 'base64'), chr(10), ''), '+/', '-_');
    v_sig := rtrim(v_sig, '=');
    v_url := trim(trailing '/' from v_base)
         || '/storage/v1/object/sign/payment-shots/' || v_path
         || '?token=' || v_hdr || '.' || v_pl || '.' || v_sig;
    if v_get is not null then
      begin
        execute format('select s.status from %I.http_get(%L) s', v_get, v_url)
          into v_status;
      exception
        when undefined_function or undefined_object
             or wrong_object_type or invalid_schema_name then
          begin
            execute format('select s.status from %I.http(%L, %L) s', v_get, 'GET', v_url)
              into v_status;
          exception when others then
            v_status := null;
          end;
        when others then
          v_status := null;
      end;
      if v_status is not null and v_status <> 200 then
        raise exception 'Storage rejected the locally-signed link (%) — the jwt_secret row does not match this project. Re-copy it (Dashboard → Settings → API → JWT Secrets, the legacy secret) into app_secrets.', v_status::text;
      end if;
    end if;
    return v_url;
  end if;

  raise exception 'No signing route worked — %. Fix service_key (the service_role key) or paste the project''s JWT secret into the jwt_secret row (both on Dashboard → Settings → API).',
    coalesce(v_r2, 'no route had its credentials');
end $$;

-- ─────────────────────────────────────────────────────────────
   9c · AI SHOT CHECK — advisory screenshot reader (Gemini)
       Reads the delegate's UPI success screenshot back and cross-checks
       the readable values against what the row DECLARES: the invoiced
       amount (watermark paises included), the payee VPA, the UTR. The
       verdict lands in shot_check as advice for the secretariat — it
       can NEVER flip a row to paid; that stays with the bank feed or
       the console's Verify click.
       Needs: gemini_api_key (free at aistudio.google.com → Get API
       key), project_url + service_key (vault read), the http
       extension. Max 3 reads per registration, counted server-side;
       a re-uploaded screenshot resets the count (submit_payment_utr).
       Runs entirely in SQL — supersedes the old edge function.
-- ───────────────────────────────────────────────────────────── */

create or replace function check_shot_ai(p_ref_code text)
returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_ref      text;
  v_row      registrations%ROWTYPE;
  v_gkey     text;
  v_vpa      text;
  v_base     text;
  v_skey     text;
  v_prev     jsonb;
  v_attempts int;
  v_ext      text;
  v_url      text;
  v_status   int;
  v_img      bytea;
  v_b64      text;
  v_mime     text;
  v_declared text;
  v_prompt   text;
  v_schema   jsonb;
  v_req      text;
  v_raw      text;
  v_resp     jsonb;
  v_text     text;
  v_verdict  jsonb;
  v_shot     jsonb;
  v_amt_line text;
  v_vpa_line text;
  v_utr_line text;
begin
  v_gkey := nullif((select value from app_secrets where key = 'gemini_api_key'), '');
  if v_gkey is null or v_gkey like 'PASTE-%' then
    raise exception 'The AI desk is not switched on yet — get a free key at aistudio.google.com (Get API key) and paste it into app_secrets → gemini_api_key.';
  end if;

  v_ref := upper(coalesce(trim(p_ref_code), ''));
  if v_ref !~ '^SM26-[A-Z0-9]{5}$' then
    raise exception 'That doesn''t look like a reference code — it is the SM26-XXXXX shown on your confirmation screen.';
  end if;
  select * into v_row from registrations where ref_code = v_ref;
  if not found then
    raise exception 'No registration for that reference code — double-check it against your confirmation screen.';
  end if;
  if v_row.payment_status = 'paid' then
    return jsonb_build_object('status', 'paid');
  end if;
  if coalesce(v_row.shot_path, '') = '' then
    raise exception 'No screenshot on this row yet — the AI desk reads the UPI success screenshot, not the UTR alone.';
  end if;

  v_prev := v_row.shot_check;
  v_attempts := coalesce(nullif(v_prev->>'attempts', '')::int, 0);
  if v_attempts >= 3 and v_prev ? 'verdict' then
    return jsonb_build_object('status', v_row.payment_status, 'verdict', v_prev->'verdict', 'cached', true);
  end if;

  v_base := nullif((select value from app_secrets where key = 'project_url'), '');
  v_skey := nullif((select value from app_secrets where key = 'service_key'), '');
  if v_base is null or v_base like 'PASTE-%' or v_skey is null or v_skey like 'PASTE-%' then
    raise exception 'The AI desk cannot reach the screenshot vault — fill project_url and service_key in app_secrets (Dashboard → Settings → API).';
  end if;

  v_ext := (select n.nspname from pg_proc p
              join pg_namespace n on n.oid = p.pronamespace
             where p.proname = 'http_post'
             order by n.nspname <> 'extensions', n.nspname
             limit 1);
  if v_ext is null then
    raise exception 'The AI desk needs the http extension — enable it (Dashboard → Database → Extensions → http).';
  end if;

  begin
    perform set_config('statement_timeout', '45000', true);
    perform set_config('http.timeout_msec', '40000', true);
  exception when others then
    null;
  end;

  v_url := trim(trailing '/' from v_base) || '/storage/v1/object/payment-shots/' || v_row.shot_path;
  begin
    execute format(
      'select s.status, s.content from %I.http_get($1, array[%I.http_header($2, $3)]) s',
      v_ext, v_ext)
      into v_status, v_img
      using v_url, 'Authorization', 'Bearer ' || v_skey;
  exception
    when undefined_function or undefined_object
         or wrong_object_type or invalid_schema_name then
      begin
        execute format(
          'select s.status, s.content from %I.http($1, $2, $3, $4, array[%I.http_header($5, $6)]) s',
          v_ext, v_ext)
          into v_status, v_img
          using 'GET', v_url, null::text, null::text, 'Authorization', 'Bearer ' || v_skey;
      exception when others then
        raise exception 'Could not pull the screenshot from the vault (%) — is service_key the service_role key?', sqlerrm;
      end;
    when others then
      raise exception 'Could not pull the screenshot from the vault (%) — is service_key the service_role key?', sqlerrm;
  end;
  if v_status <> 200 then
    raise exception 'The screenshot vault answered % — is service_key the service_role key?', v_status::text;
  end if;
  if octet_length(v_img) = 0 then
    raise exception 'The screenshot came back empty from the vault — re-upload it from your confirmation screen.';
  end if;
  if octet_length(v_img) > 8 * 1024 * 1024 then
    raise exception 'That screenshot is over 8 MB — too large for the AI desk. The secretariat can still open it with View payment.';
  end if;

  v_mime := case
              when lower(v_row.shot_path) like '%.png'  then 'image/png'
              when lower(v_row.shot_path) like '%.webp' then 'image/webp'
              else 'image/jpeg'
            end;
  v_b64 := replace(encode(v_img, 'base64'), chr(10), '');

  v_vpa := nullif((select value from app_secrets where key = 'payee_vpa'), '');
  if v_vpa like 'PASTE-%' then
    v_vpa := null;
  end if;

  if v_row.expected_amount is not null then
    v_amt_line := 'invoiced amount: ₹' || to_char(v_row.expected_amount, 'FM999999990.00')
                || ' — the paise digits are a deliberate unique watermark; treat them as significant';
  end if;
  if coalesce(v_vpa, '') <> '' then
    v_vpa_line := 'payee VPA: ' || v_vpa;
  end if;
  if coalesce(v_row.upi_utr, '') <> '' then
    v_utr_line := 'declared UTR: ' || v_row.upi_utr;
  end if;
  v_declared := concat_ws(E'\n', v_amt_line, v_vpa_line, v_utr_line);

  v_prompt :=
    'You are a payment-desk assistant for a school Model UN conference. A delegate uploaded a UPI app screenshot as evidence of paying their fee. Read the screenshot and compare ONLY what is plainly readable on it against these declared values:' || E'\n'
    || v_declared || E'\n\nRules:' || E'\n'
    || '- You are NOT a forensic tool. Never claim the image is authentic, edited or manipulated; judge only the readable values.' || E'\n'
    || '- consistency = ''match'' only when payment_complete is true AND the amount equals the invoiced amount exactly (to the paisa) AND the payee VPA matches when readable AND the UTR matches when both are readable.' || E'\n'
    || '- consistency = ''mismatch'' when any readable value plainly contradicts the declared ones (wrong amount, wrong payee, failed/declined screen).' || E'\n'
    || '- consistency = ''unclear'' when you cannot read enough to decide.' || E'\n'
    || '- Keep notes to one short, kind, actionable sentence.';

  v_schema := jsonb_build_object(
    'type', 'object',
    'properties', jsonb_build_object(
      'app',              jsonb_build_object('type', 'string', 'description', 'UPI app name if visible, else empty'),
      'payment_complete', jsonb_build_object('type', 'boolean', 'description', 'true only if the screen shows a completed/successful payment (tick / Paid / Success)'),
      'amount',           jsonb_build_object('type', 'number', 'description', 'the amount the screenshot shows as paid, 0 if unreadable'),
      'payee_vpa',        jsonb_build_object('type', 'string', 'description', 'payee UPI id shown on the screen, empty if unreadable'),
      'payee_name',       jsonb_build_object('type', 'string', 'description', 'payee name shown on the screen, empty if unreadable'),
      'utr',              jsonb_build_object('type', 'string', 'description', 'UTR / transaction id shown on the screen, empty if unreadable'),
      'anomalies',        jsonb_build_object('type', 'array', 'items', jsonb_build_object('type', 'string'), 'description', 'readable contradictions vs the declared values, empty if none'),
      'consistency',      jsonb_build_object('type', 'string', 'enum', jsonb_build_array('match', 'mismatch', 'unclear')),
      'notes',            jsonb_build_object('type', 'string', 'description', 'one short sentence a human can act on')),
    'required', jsonb_build_array('consistency', 'notes'));

  v_req := json_build_object(
    'contents', json_build_array(json_build_object('parts', json_build_array(
      json_build_object('text', v_prompt),
      json_build_object('inline_data', json_build_object('mime_type', v_mime, 'data', v_b64))))),
    'generationConfig', json_build_object(
      'temperature', 0.1,
      'responseMimeType', 'application/json',
      'responseSchema', v_schema,
      'thinkingConfig', json_build_object('thinkingBudget', 0)))::text;

  begin
    execute format(
      'select s.status, s.content from %I.http_post($1, $2, $3, array[%I.http_header($4, $5)]) s',
      v_ext, v_ext)
      into v_status, v_img
      using 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
            v_req, 'application/json', 'x-goog-api-key', v_gkey;
  exception
    when undefined_function or undefined_object
         or wrong_object_type or invalid_schema_name then
      begin
        execute format(
          'select s.status, s.content from %I.http($1, $2, $3, $4, array[%I.http_header($5, $6)]) s',
          v_ext, v_ext)
          into v_status, v_img
          using 'POST',
                'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
                v_req, 'application/json', 'x-goog-api-key', v_gkey;
      exception when others then
        raise exception 'The AI desk could not be reached (%) — try again in a moment.', sqlerrm;
      end;
    when others then
      raise exception 'The AI desk could not be reached (%) — try again in a moment.', sqlerrm;
  end;
  if v_status <> 200 then
    raise exception 'The AI desk is unavailable (Gemini answered %). Try again in a moment — the secretariat verifies by hand either way.', v_status::text;
  end if;

  v_raw := convert_from(v_img, 'utf8');
  begin
    v_resp := v_raw::jsonb;
  exception when others then
    raise exception 'Gemini answered in an unexpected shape — try again.';
  end;
  v_text := v_resp #>> '{candidates,0,content,parts,0,text}';
  if coalesce(v_text, '') = '' then
    raise exception 'Gemini answered without a readable verdict — try again.';
  end if;
  begin
    v_verdict := v_text::jsonb;
  exception when others then
    raise exception 'Gemini''s verdict was not parseable — try again.';
  end;
  if coalesce(v_verdict->>'consistency', '') not in ('match', 'mismatch', 'unclear') then
    raise exception 'Gemini''s verdict was not parseable — try again.';
  end if;

  v_shot := jsonb_build_object(
    'checked_at', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'attempts', v_attempts + 1,
    'model', 'gemini-2.5-flash',
    'expected', jsonb_build_object('amount', v_row.expected_amount, 'vpa', v_vpa, 'utr', v_row.upi_utr),
    'verdict', v_verdict);
  update registrations set shot_check = v_shot where id = v_row.id;

  return jsonb_build_object('status', v_row.payment_status, 'verdict', v_verdict);
end $$;

-- ─────────────────────────────────────────────────────────────
   10 · GRANTS — the public doors, nothing more
   ───────────────────────────────────────────────────────────── */

grant execute on function
  register_delegate(text, text, text, text, text, text, text, text, text, text, text, text, text)
  to anon, authenticated;
grant execute on function
  submit_payment_utr(text, text, numeric, text) to anon, authenticated;
grant execute on function
  payment_status(text, text) to anon, authenticated;
grant execute on function
  ingest_credit(text, text, text) to anon, authenticated;
grant execute on function
  pay_admin_overview(text) to anon, authenticated;
grant execute on function
  pay_admin_search(text, text, text) to anon, authenticated;
grant execute on function
  pay_admin_decide(text, text, text, text) to anon, authenticated;
grant execute on function
  pay_admin_bind(text, text, text) to anon, authenticated;
grant execute on function
  pay_admin_ignore(text, text, boolean) to anon, authenticated;
grant execute on function
  pay_admin_requeue(text, text) to anon, authenticated;
grant execute on function
  pay_admin_shot_url(text, text) to anon, authenticated;
grant execute on function
  check_shot_ai(text) to anon, authenticated;
