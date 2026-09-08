-- ————————————————————————————————————————————————————————————————
-- SOMUN '26 — UPI QR PAYMENT VERIFICATION (no gateway · no KYC)
-- Run ONCE in the Supabase SQL Editor. Idempotent — safe to re-run.
--
-- The school's PAN/KYC is unavailable, so there is no payment gateway.
-- Delegates pay the conference UPI QR; this schema verifies those
-- payments AUTOMATICALLY:
--
--   delegate pays QR ──▶ submits UTR (12-digit UPI txn id) on the site
--   organizer's phone ─▶ SMS-forwarder app POSTs every bank credit SMS
--                        to ingest_credit()  (secret-keyed)
--   THIS SCHEMA      ──▶ parses amount + UTR out of each SMS and
--                        cross-matches BOTH directions:
--                          credit arrives → match pending UTR → paid
--                          UTR submitted  → match past credit  → paid
--   match            ──▶ registrations.payment_status = 'paid'
--                    ──▶ a row drops into mail_queue → your Database
--                        Webhook (Brevo) sends the confirmation mail
--
-- Manual override lives in the site's secretariat console (#/verify):
-- verify / reject / bind a credit to a delegate by hand.
--
-- AFTER RUNNING, SET YOUR KEYS (SQL Editor, one line each):
--   update public.app_secrets set value = '<long random string>'
--     where name = 'admin_key';   -- unlocks #/verify on the site
--   update public.app_secrets set value = '<another random string>'
--     where name = 'ingest_key';  -- goes into the SMS-forwarder app
-- ————————————————————————————————————————————————————————————————

-- ————— 0 · secrets (private; only SECURITY DEFINER functions read it) —————
create table if not exists public.app_secrets (
  name  text primary key,
  value text not null
);
insert into public.app_secrets (name, value)
values ('admin_key', 'CHANGE-ME-admin'), ('ingest_key', 'CHANGE-ME-ingest')
on conflict (name) do nothing;
revoke all on public.app_secrets from anon, authenticated;
alter table public.app_secrets enable row level security;
-- no policies: accessible ONLY inside security definer functions

-- ————— 1 · payment columns on registrations —————
alter table public.registrations
  add column if not exists upi_utr          text,
  add column if not exists utr_raw          text,
  add column if not exists utr_submitted_at timestamptz,
  add column if not exists shot_path        text,
  add column if not exists matched_credit   uuid,
  add column if not exists status_note      text;

-- one UTR can never verify two registrations (even across re-submits)
create unique index if not exists registrations_utr_uniq
  on public.registrations (upi_utr) where upi_utr is not null;
create index if not exists registrations_status_amt_idx
  on public.registrations (payment_status, amount);

-- ————— 2 · payment_credits — the raw bank credit feed —————
create table if not exists public.payment_credits (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  recv_at     timestamptz not null default now(),
  src         text not null default 'sms',   -- sms | manual
  sender      text,                          -- e.g. HDFCBK / SBIINB
  body        text not null,
  amount_inr  numeric(10,2),                 -- parsed
  utr         text,                          -- parsed, normalised
  consumed_by uuid references public.registrations(id),
  ignored     boolean not null default false
);
create index if not exists credits_utr_idx     on public.payment_credits (utr);
create index if not exists credits_consume_idx on public.payment_credits (consumed_by);
create index if not exists credits_amount_idx  on public.payment_credits (amount_inr);
revoke all on public.payment_credits from anon, authenticated;
alter table public.payment_credits enable row level security;
-- no policies: the feed is written by ingest_credit() only

-- ————— 3 · mail_queue — confirmation mails waiting to be sent —————
-- A Database Webhook (dashboard → Database → Webhooks) fires Brevo on
-- INSERT here. See supabase/PAYMENT-SETUP.md § 4.
create table if not exists public.mail_queue (
  id             uuid primary key default gen_random_uuid(),
  created_at     timestamptz not null default now(),
  registration_id uuid references public.registrations(id),
  to_email       text not null,
  payload        jsonb not null
);
create index if not exists mail_queue_reg_idx on public.mail_queue (registration_id);
revoke all on public.mail_queue from anon, authenticated;
alter table public.mail_queue enable row level security;
-- no policies: webhooks read via the generated trigger function

-- ————— 4 · parsers —————
create or replace function public.somun_norm_utr(p text)
returns text language sql immutable as $$
  select upper(regexp_replace(coalesce(p, ''), '[^0-9A-Za-z]', '', 'g'));
$$;

create or replace function public.somun_parse_amount(p_body text)
returns numeric language sql immutable as $$
  select nullif(regexp_replace(
           (regexp_match(p_body, '(?:rs\.?|inr|₹)[^0-9]{0,3}([0-9][0-9,]*(?:\.[0-9]{1,2})?)', 'i'))[1],
           ',', '', 'g'), '')::numeric;
$$;

create or replace function public.somun_parse_utr(p_body text)
returns text language plpgsql immutable as $$
declare m text[];
begin
  -- labelled forms first: "UTR no 4033…" · "UPI Ref no 4033…" · "RRN: 4033…"
  m := regexp_match(p_body, '(?:utr|rrn|upi[^0-9]{0,12}(?:ref|rrn)?|ref[ .:no]*)(?:no\.?[: ]*)?([0-9]{9,16})', 'i');
  if m is null or m[1] is null then
    -- bare 12-digit number (UPI reference numbers are 12 digits)
    m := regexp_match(p_body, '(?<![0-9])([0-9]{12})(?![0-9])');
  end if;
  return public.somun_norm_utr(m[1]);
end $$;

create or replace function public.somun_body_is_credit(p_body text)
returns boolean language sql immutable as $$
  select p_body ~* '(credited|received|deposited)'
     and p_body !~* '(debited|sent to|paid to|withdrawn|purchase|spent)';
$$;

-- ————— 5 · the matcher —————
-- flips a pending registration to paid against a given credit
create or replace function public.somun_apply_match(p_reg uuid, p_credit uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.registrations r
     set payment_status = 'paid',
         paid_at        = coalesce(r.paid_at, now()),
         matched_credit = p_credit,
         status_note    = coalesce(r.status_note, '')
   where r.id = p_reg and r.payment_status = 'pending';
  if found then
    update public.payment_credits c
       set consumed_by = p_reg
     where c.id = p_credit and c.consumed_by is null;
  end if;
end $$;

-- called by the credit-insert trigger AND by ingest_credit()
create or replace function public.somun_match_credit(p_credit uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  c      public.payment_credits%rowtype;
  v_reg  uuid;
  v_cnt  int;
begin
  select * into c from public.payment_credits where id = p_credit;
  if c.consumed_by is not null or c.ignored or c.amount_inr is null then
    return null;
  end if;
  if not public.somun_body_is_credit(c.body) then
    return null;
  end if;

  -- ① exact UTR — decisive
  if c.utr is not null then
    select r.id into v_reg
      from public.registrations r
     where r.upi_utr = c.utr and r.payment_status = 'pending'
     order by r.created_at
     limit 1 for update;
    if v_reg is not null then
      perform public.somun_apply_match(v_reg, p_credit);
      return v_reg;
    end if;
  end if;

  -- ② amount + time window — only when UNAMBIGUOUS
  --    exactly one pending registration of that amount, created in the
  --    72h before the credit (+10 min clock skew), and no other pending
  --    registration shares that amount
  select count(*) into v_cnt from public.registrations r
   where r.payment_status = 'pending' and r.amount = c.amount_inr;
  if v_cnt = 1 then
    select r.id into v_reg
      from public.registrations r
     where r.payment_status = 'pending'
       and r.amount = c.amount_inr
       and r.created_at <  (coalesce(c.recv_at, now()) + interval '10 minutes')
       and r.created_at >  (coalesce(c.recv_at, now()) - interval '72 hours')
     order by r.created_at
     limit 1 for update;
    if v_reg is not null then
      perform public.somun_apply_match(v_reg, p_credit);
      return v_reg;
    end if;
  end if;
  return null;
end $$;

-- ————— 6 · triggers —————
-- new credit lands → try to match it right away
create or replace function public.somun_on_credit_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_amt numeric; v_utr text;
begin
  v_amt := public.somun_parse_amount(new.body);
  v_utr := public.somun_parse_utr(new.body);
  update public.payment_credits set amount_inr = v_amt, utr = v_utr where id = new.id;
  perform public.somun_match_credit(new.id);
  return new;
end $$;

drop trigger if exists somun_credit_ins on public.payment_credits;
create trigger somun_credit_ins
  after insert on public.payment_credits
  for each row execute function public.somun_on_credit_insert();

-- registration becomes paid → queue the confirmation mail
create or replace function public.somun_on_paid()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.payment_status = 'paid'
     and (tg_op = 'INSERT' or old.payment_status is distinct from 'paid') then
    insert into public.mail_queue (registration_id, to_email, payload)
    values (new.id, new.email, jsonb_build_object(
      'ref_code', new.ref_code,
      'name',     new.full_name,
      'amount',   new.amount,
      'utr',      new.upi_utr,
      'paid_at',  coalesce(new.paid_at, now())));
  end if;
  return new;
end $$;

drop trigger if exists somun_mail_paid on public.registrations;
create trigger somun_mail_paid
  after insert or update of payment_status on public.registrations
  for each row execute function public.somun_on_paid();

-- ————— 7 · RPCs — the only doors into the data —————
-- helper: is this the console key?
create or replace function public.somun_is_admin(p_key text)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  return p_key is not null and length(p_key) >= 8
     and p_key = (select s.value from public.app_secrets s where s.name = 'admin_key');
end $$;

-- · delegate registration (anon, from the wizard) ————————————————————
-- The wizard submits through this SECURITY DEFINER door instead of the
-- bare anon insert: validation is server-side, ref codes are deconflicted
-- here, and registration no longer depends on any insert policy/grant.
create or replace function public.register_delegate(
  p_ref_code text,
  p_full_name text, p_email text, p_phone text, p_institution text,
  p_grade_or_title text default null, p_experience text default 'novice',
  p_pref1 text default null, p_pref2 text default null, p_pref3 text default null,
  p_portfolio text default null, p_notes text default null
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_code text := upper(nullif(trim(p_ref_code), ''));
  v_row  public.registrations%rowtype;
  v_tries int := 0;
begin
  if length(coalesce(p_full_name, '')) < 3 then
    raise exception 'Please enter your full name.';
  end if;
  if p_email !~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'That email address does not look right.';
  end if;
  if regexp_replace(coalesce(p_phone, ''), '\D', '', 'g') !~ '^.{8,15}$' then
    raise exception 'That phone number does not look right.';
  end if;
  if coalesce(trim(p_institution), '') = '' then
    raise exception 'Institution / organisation is required.';
  end if;
  if p_experience not in ('novice', 'intermediate', 'veteran') then
    p_experience := 'novice';
  end if;
  if v_code !~ '^SM26-[A-Z0-9]{4,10}$' then v_code := null; end if;

  loop
    v_tries := v_tries + 1;
    if v_code is null then
      v_code := 'SM26-' || array_to_string(array(
        select substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', floor(random() * 31)::int + 1, 1)
        from generate_series(1, 5)), '');
    end if;
    begin
      insert into public.registrations
        (ref_code, full_name, email, phone, institution, grade_or_title,
         experience, committee_pref1, committee_pref2, committee_pref3,
         portfolio, notes)
      values
        (v_code, trim(p_full_name), lower(trim(p_email)), trim(p_phone),
         trim(p_institution), nullif(trim(coalesce(p_grade_or_title, '')), ''),
         p_experience, nullif(p_pref1, ''), nullif(p_pref2, ''), nullif(p_pref3, ''),
         nullif(trim(coalesce(p_portfolio, '')), ''), nullif(trim(coalesce(p_notes, '')), ''))
      returning * into v_row;
      exit;
    exception when unique_violation then
      v_code := null;  -- ref code collision → deal a fresh one
      if v_tries >= 6 then
        raise exception 'Could not allot a reference code — please retry in a moment.';
      end if;
    end;
  end loop;

  return jsonb_build_object('ref_code', v_row.ref_code, 'id', v_row.id,
                            'status', v_row.payment_status);
end $$;

-- · delegate submits the UTR (anon, from the success box) ————————
create or replace function public.submit_payment_utr(
  p_ref_code text, p_utr text, p_amount numeric, p_shot_path text default null
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_reg    public.registrations%rowtype;
  v_utr    text := public.somun_norm_utr(p_utr);
  v_amt    numeric;
  v_credit uuid;
  v_flood  int;
begin
  if v_utr !~ '^[0-9A-Z]{10,16}$' then
    raise exception 'That does not look like a UPI transaction ID — it is usually 12 digits. Open your UPI app → payment → transaction details.';
  end if;
  if p_amount is null or p_amount < 1 or p_amount > 1000000 then
    raise exception 'Amount looks invalid.';
  end if;
  v_amt := round(p_amount);

  -- cheap flood guard: the desk cannot be spammed
  select count(*) into v_flood from public.registrations
   where utr_submitted_at > now() - interval '1 hour';
  if v_flood > 80 then
    raise exception 'The payment desk is busy right now — try again in a few minutes.';
  end if;

  select * into v_reg from public.registrations
   where ref_code = upper(trim(p_ref_code)) for update;
  if not found then
    raise exception 'Reference code not found — check the code shown after you registered.';
  end if;
  if v_reg.payment_status = 'paid' then
    return jsonb_build_object('status', 'paid', 'ref_code', v_reg.ref_code);
  end if;

  update public.registrations
     set amount = v_amt,
         upi_utr = v_utr,
         utr_raw = trim(p_utr),
         utr_submitted_at = now(),
         shot_path = nullif(trim(coalesce(p_shot_path, '')), '')
   where id = v_reg.id;

  -- match against credits that arrived BEFORE the UTR was submitted
  select c.id into v_credit from public.payment_credits c
   where c.consumed_by is null and not c.ignored and c.utr = v_utr
     and public.somun_body_is_credit(c.body)
   order by c.recv_at limit 1;
  if v_credit is not null then
    perform public.somun_apply_match(v_reg.id, v_credit);
    return jsonb_build_object('status', 'paid', 'ref_code', v_reg.ref_code,
                              'matched', true);
  end if;

  -- amount fallback: only when no other pending row shares the amount
  -- and exactly one unconsumed credit of that amount exists (72h)
  select count(*) into v_flood from public.registrations
   where payment_status = 'pending' and amount = v_amt and id <> v_reg.id;
  if v_flood = 0 then
    select count(*), min(c.id) into v_flood, v_credit
      from public.payment_credits c
     where c.consumed_by is null and not c.ignored
       and c.amount_inr = v_amt
       and public.somun_body_is_credit(c.body)
       and c.recv_at > now() - interval '72 hours';
    if v_flood = 1 and v_credit is not null then
      perform public.somun_apply_match(v_reg.id, v_credit);
      return jsonb_build_object('status', 'paid', 'ref_code', v_reg.ref_code,
                                'matched', true);
    end if;
  end if;

  return jsonb_build_object('status', 'pending', 'ref_code', v_reg.ref_code,
                            'matched', false);
end $$;

-- · delegate checks status (needs ref code AND email — no fishing) ————
create or replace function public.payment_status(p_ref_code text, p_email text)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_reg public.registrations%rowtype;
begin
  select * into v_reg from public.registrations
   where ref_code = upper(trim(p_ref_code))
     and email = lower(trim(p_email));
  if not found then
    raise exception 'No application matches that reference code and email together.';
  end if;
  return jsonb_build_object(
    'status',   v_reg.payment_status,
    'ref_code', v_reg.ref_code,
    'amount',   v_reg.amount,
    'utr_set',  v_reg.upi_utr is not null,
    'paid_at',  v_reg.paid_at);
end $$;

-- · ingest one bank credit SMS (SMS-forwarder app / manual paste) ————
create or replace function public.ingest_credit(
  p_key text, p_body text, p_src text default 'sms',
  p_sender text default null, p_recv_at timestamptz default now()
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_ok  boolean;
  v_id  uuid;
  v_reg uuid;
begin
  v_ok := p_key is not null and length(p_key) >= 8 and (
            p_key = (select s.value from public.app_secrets s where s.name = 'ingest_key')
         or p_key = (select s.value from public.app_secrets s where s.name = 'admin_key'));
  if not v_ok then raise exception 'Bad ingest key.'; end if;
  if coalesce(trim(p_body), '') = '' then raise exception 'Empty SMS body.'; end if;

  insert into public.payment_credits (src, sender, body, recv_at)
  values (coalesce(nullif(trim(p_src), ''), 'sms'), p_sender, trim(p_body), coalesce(p_recv_at, now()))
  returning id into v_id;

  v_reg := public.somun_match_credit(v_id);
  return jsonb_build_object('ok', true, 'credit_id', v_id,
    'amount', (select amount_inr from public.payment_credits where id = v_id),
    'utr',    (select utr        from public.payment_credits where id = v_id),
    'matched_registration', v_reg);
end $$;

-- · console: one snapshot of everything (admin key) ——————————————————
create or replace function public.pay_admin_overview(p_key text)
returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if not public.somun_is_admin(p_key) then raise exception 'Wrong console key.'; end if;
  return jsonb_build_object(
    'stats', jsonb_build_object(
      'pending_utr', (select count(*) from public.registrations where payment_status='pending' and upi_utr is not null),
      'pending_no_utr', (select count(*) from public.registrations where payment_status='pending' and upi_utr is null),
      'paid',   (select count(*) from public.registrations where payment_status='paid'),
      'failed', (select count(*) from public.registrations where payment_status='failed'),
      'unmatched', (select count(*) from public.payment_credits where consumed_by is null and not ignored and amount_inr is not null),
      'mail_waiting', (select count(*) from public.mail_queue)),
    'pending', coalesce((
      select jsonb_agg(to_jsonb(t) order by t.utr_submitted_at desc nulls last)
      from (select id, ref_code, full_name, email, phone, institution, amount,
                   upi_utr, utr_raw, shot_path, status_note,
                   utr_submitted_at, created_at
              from public.registrations
             where payment_status = 'pending' and upi_utr is not null
             order by utr_submitted_at desc limit 200) t), jsonb_build_array()),
    'no_utr', coalesce((
      select jsonb_agg(to_jsonb(t) order by t.created_at desc)
      from (select id, ref_code, full_name, email, amount, created_at
              from public.registrations
             where payment_status = 'pending' and upi_utr is null
             order by created_at desc limit 100) t), jsonb_build_array()),
    'credits', coalesce((
      select jsonb_agg(to_jsonb(t) order by t.recv_at desc)
      from (select id, recv_at, src, sender, left(body, 240) as body,
                   amount_inr, utr, consumed_by, ignored
              from public.payment_credits
             order by recv_at desc limit 200) t), jsonb_build_array()),
    'mail', coalesce((
      select jsonb_agg(to_jsonb(t) order by t.created_at desc)
      from (select q.id, q.created_at, q.to_email, q.payload,
                   r.ref_code, r.full_name
              from public.mail_queue q
              left join public.registrations r on r.id = q.registration_id
             order by q.created_at desc limit 100) t), jsonb_build_array()),
    'paid_recent', coalesce((
      select jsonb_agg(to_jsonb(t) order by t.paid_at desc)
      from (select id, ref_code, full_name, email, amount, upi_utr, paid_at, matched_credit
              from public.registrations
             where payment_status = 'paid'
             order by paid_at desc limit 30) t), jsonb_build_array()));
end $$;

-- · console: verify / reject / reset a registration —————————————————
create or replace function public.pay_admin_decide(
  p_key text, p_registration uuid, p_action text, p_note text default null
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_reg public.registrations%rowtype;
begin
  if not public.somun_is_admin(p_key) then raise exception 'Wrong console key.'; end if;
  select * into v_reg from public.registrations where id = p_registration for update;
  if not found then raise exception 'Registration not found.'; end if;

  if p_action = 'paid' then
    update public.registrations
       set payment_status = 'paid', paid_at = coalesce(paid_at, now()),
           status_note = coalesce(status_note, '') ||
             case when coalesce(p_note,'') <> '' then ' · manual: ' || p_note else ' · manual verify' end
     where id = v_reg.id;
  elsif p_action = 'failed' then
    update public.registrations
       set payment_status = 'failed',
           status_note = coalesce(p_note, 'rejected by secretariat')
     where id = v_reg.id;
    update public.payment_credits set consumed_by = null
     where consumed_by = v_reg.id;
    delete from public.mail_queue where registration_id = v_reg.id;
  elsif p_action = 'pending' then
    update public.registrations
       set payment_status = 'pending', paid_at = null, matched_credit = null
     where id = v_reg.id;
    update public.payment_credits set consumed_by = null
     where consumed_by = v_reg.id;
    delete from public.mail_queue where registration_id = v_reg.id;
  else
    raise exception 'Unknown action.';
  end if;
  return jsonb_build_object('ok', true, 'ref_code', v_reg.ref_code, 'action', p_action);
end $$;

-- · console: bind a credit to a registration by hand ————————————————
create or replace function public.pay_admin_bind(
  p_key text, p_credit uuid, p_registration uuid
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_reg public.registrations%rowtype; v_c public.payment_credits%rowtype;
begin
  if not public.somun_is_admin(p_key) then raise exception 'Wrong console key.'; end if;
  select * into v_reg from public.registrations where id = p_registration for update;
  select * into v_c   from public.payment_credits  where id = p_credit    for update;
  if not found then raise exception 'Registration not found.'; end if;
  if v_c.consumed_by is not null and v_c.consumed_by <> p_registration then
    raise exception 'That credit is already consumed by another registration.';
  end if;
  if v_reg.upi_utr is null and v_c.utr is not null then
    update public.registrations set upi_utr = v_c.utr, utr_raw = v_c.utr,
           utr_submitted_at = coalesce(utr_submitted_at, now())
     where id = p_registration;
  end if;
  if v_reg.amount is null and v_c.amount_inr is not null then
    update public.registrations set amount = v_c.amount_inr where id = p_registration;
  end if;
  perform public.somun_apply_match(p_registration, p_credit);
  return jsonb_build_object('ok', true, 'ref_code', v_reg.ref_code);
end $$;

-- · console: ignore / restore a credit ———————————————————————————————
create or replace function public.pay_admin_ignore(
  p_key text, p_credit uuid, p_ignore boolean default true
) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if not public.somun_is_admin(p_key) then raise exception 'Wrong console key.'; end if;
  update public.payment_credits set ignored = p_ignore, consumed_by = null
   where id = p_credit;
  if not found then raise exception 'Credit not found.'; end if;
  return jsonb_build_object('ok', true);
end $$;

-- · console: re-queue the confirmation mail (webhook refires) ————————
create or replace function public.pay_admin_requeue(p_key text, p_registration uuid)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_reg public.registrations%rowtype;
begin
  if not public.somun_is_admin(p_key) then raise exception 'Wrong console key.'; end if;
  select * into v_reg from public.registrations where id = p_registration;
  if not found then raise exception 'Registration not found.'; end if;
  delete from public.mail_queue where registration_id = p_registration;
  insert into public.mail_queue (registration_id, to_email, payload)
  values (p_registration, v_reg.email, jsonb_build_object(
    'ref_code', v_reg.ref_code, 'name', v_reg.full_name,
    'amount', v_reg.amount, 'utr', v_reg.upi_utr,
    'paid_at', coalesce(v_reg.paid_at, now())));
  return jsonb_build_object('ok', true);
end $$;

-- ————— 8 · storage — private bucket for payment screenshots ————————
insert into storage.buckets (id, name, public)
values ('payment-shots', 'payment-shots', false)
on conflict (id) do nothing;

drop policy if exists "delegates can upload payment screenshots" on storage.objects;
create policy "delegates can upload payment screenshots"
  on storage.objects
  for insert
  to anon
  with check (bucket_id = 'payment-shots');
-- deliberately NO read policy: screenshots stay private — the console
-- shows the path, files are viewed from Dashboard → Storage.

-- ————— 9 · grants — only these doors exist ——————————————————————————
revoke execute on function public.register_delegate(text, text, text, text, text, text, text, text, text, text, text, text) from public;
revoke execute on function public.submit_payment_utr(text, text, numeric, text) from public;
revoke execute on function public.payment_status(text, text) from public;
revoke execute on function public.ingest_credit(text, text, text, text, timestamptz) from public;
revoke execute on function public.pay_admin_overview(text) from public;
revoke execute on function public.pay_admin_decide(text, uuid, text, text) from public;
revoke execute on function public.pay_admin_bind(text, uuid, uuid) from public;
revoke execute on function public.pay_admin_ignore(text, uuid, boolean) from public;
revoke execute on function public.pay_admin_requeue(text, uuid) from public;
revoke execute on function public.somun_is_admin(text) from public;

grant execute on function public.register_delegate(text, text, text, text, text, text, text, text, text, text, text, text) to anon;
grant execute on function public.submit_payment_utr(text, text, numeric, text) to anon;
grant execute on function public.payment_status(text, text) to anon;
grant execute on function public.ingest_credit(text, text, text, text, timestamptz) to anon;
grant execute on function public.pay_admin_overview(text) to anon;
grant execute on function public.pay_admin_decide(text, uuid, text, text) to anon;
grant execute on function public.pay_admin_bind(text, uuid, uuid) to anon;
grant execute on function public.pay_admin_ignore(text, uuid, boolean) to anon;
grant execute on function public.pay_admin_requeue(text, uuid) to anon;
