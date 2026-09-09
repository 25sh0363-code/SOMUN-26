-- ══════════════════════════════════════════════════════════════════
  fix-view-payment.sql — console patch, Sep 10

  Three things in one idempotent paste:

  1. View payment died with schema "http" does not exist —
     Supabase installs the http extension into its `extensions`
     schema, and the old function hardcoded `http.`. Now the real
     schema is resolved from pg_extension at run time (and the
     extension installs itself into `extensions` while still off).

  2. The console gains its Rejected payments book — the overview
     RPC ships `rejected_recent` (name, email, invoice, UTR,
     rejection reason) beside the verified list.

  3. Restoring a rejected row now clears its stale rejection
     reason, while reverting a verified row keeps its notes.

  Run: whole file, once, in Supabase → SQL Editor. Safe to re-run.
  Nothing else is touched — delegates, payments and the admin key
  stay exactly as they are. Then refresh the console page.
-- ══════════════════════════════════════════════════════════════════

do $$ begin
  if not exists (select 1 from pg_extension where extname = 'http') then
    create schema if not exists extensions;
    execute 'create extension http with schema extensions';
  end if;
end $$;

create or replace function pay_admin_shot_url(p_key text, p_registration text)
returns text
language plpgsql security definer set search_path = public as $$
declare
  v_path    text;
  v_skey    text;
  v_base    text;
  v_ext     text;
  v_sign    text;
  v_status  int;
  v_body    jsonb;
  v_url     text;
begin
  perform somun_guard(p_key);
  select shot_path into v_path from registrations where id::text = p_registration;
  if not found then raise exception 'Registration not found.'; end if;
  if coalesce(v_path, '') = '' then
    raise exception 'No screenshot on this row yet.';
  end if;
  v_skey := nullif((select value from app_secrets where key = 'service_key'), '');
  v_base := nullif((select value from app_secrets where key = 'project_url'), '');
  if v_skey is null or v_skey like 'PASTE-%'
     or v_base is null or v_base like 'PASTE-%' then
    raise exception 'Screenshot viewing is not configured yet — fill service_key and project_url in app_secrets (Dashboard → Settings → API).';
  end if;

  -- where does this project actually keep the http extension?
  v_ext := (select extnamespace::regnamespace::text from pg_extension where extname = 'http');
  if v_ext is null then
    raise exception 'The http extension is not active — Supabase Dashboard → Database → Extensions → enable "http", then click View payment again.';
  end if;

  v_sign := trim(trailing '/' from v_base) || '/storage/v1/object/sign/payment-shots/' || v_path;

  begin
    execute format(
      'select s.status, convert_from(s.content, ''utf8'')::jsonb
         from %I.http_post(%L, %L, %L, array[%I.http_header(''Authorization'', %L)]) s',
      v_ext, v_sign, '{"expiresIn": 3600}', 'application/json', v_ext, 'Bearer ' || v_skey
    ) into v_status, v_body;
  exception when undefined_function or undefined_object
             or wrong_object_type or invalid_schema_name then
    -- older pgsql-http builds: same request through the generic entry point
    begin
      execute format(
        'select s.status, convert_from(s.content, ''utf8'')::jsonb
           from %I.http(%L, %L, %L, %L, array[%I.http_header(''Authorization'', %L)]) s',
        v_ext, 'POST', v_sign, 'application/json', '{"expiresIn": 3600}', v_ext, 'Bearer ' || v_skey
      ) into v_status, v_body;
    exception when others then
      raise exception 'Storage signing failed (%). Re-run supabase/fix-view-payment.sql; if the http extension is off, enable it under Database → Extensions.', sqlerrm;
    end;
  end;

  if v_status is null then
    raise exception 'Storage did not answer the signing request.';
  end if;
  if v_status <> 200 then
    raise exception 'Storage refused to sign the screenshot (%).', coalesce(v_body->>'message', v_status::text);
  end if;
  v_url := v_body->>'signedURL';
  if v_url is null then
    raise exception 'Storage returned no signed URL — check the service_key.';
  end if;
  return trim(trailing '/' from v_base) || v_url;
end $$;

-- ─────────────────────────────────────────────────────────────
   2 · the Rejected payments book — same overview RPC, one new
       list beside the verified one (name, email, invoice, UTR,
       rejection reason), latest first
-- ───────────────────────────────────────────────────────────── */

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
               upi_utr, paid_at, paid_via
          from registrations
         where payment_status = 'paid'
         order by paid_at desc
         limit 20) x), json_build_array()),
    'rejected_recent', coalesce((
      select json_agg(x) from (
        select id::text, ref_code, full_name, email,
               expected_amount as amount, upi_utr,
               status_note, utr_submitted_at
          from registrations
         where payment_status = 'failed'
         order by utr_submitted_at desc nulls last
         limit 20) x), json_build_array()));
end $$;

-- ─────────────────────────────────────────────────────────────
   3 · restoring a rejected row clears its stale rejection
       reason; reverting a verified row keeps its notes
-- ───────────────────────────────────────────────────────────── */

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
  elsif p_action = 'pending' then
    update registrations
       set payment_status = case when upi_utr is not null then 'verifying' else 'registered' end,
           paid_at = null, paid_via = null,
           -- restoring a rejected row drops its stale rejection reason;
           -- reverting a paid row keeps any verification note
           status_note = case when payment_status = 'failed' then null else status_note end
     where id = v_id;
    delete from mail_queue where registration_id = v_id::text and sent_at is null;
  else
    raise exception 'Unknown action.';
  end if;
end $$;

grant execute on function pay_admin_shot_url(text, text) to anon, authenticated;
