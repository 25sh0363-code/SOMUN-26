-- ══════════════════════════════════════════════════════════════════════
   SOMUN '26 — AUTOMATED MAIL HOOK (mail_queue → your Gmail via Apps Script)
   ══════════════════════════════════════════════════════════════════════
   When a payment verifies, a row lands in mail_queue. This trigger picks
   it up, attaches the delegate's details, and POSTs everything to your
   Google Apps Script web app, which sends the mail from your own Gmail.

   INSTALL (full walkthrough in supabase/MAIL-SETUP.md):
   1. Create the Apps Script (supabase/apps-script/Code.gs) and deploy it
      as a Web app — you get a script.google.com/.../exec URL.
   2. Fill the two updates below (or edit the rows later in
      Table Editor → app_secrets):
        mailer_url    → the …/exec URL from step 1
        mailer_secret → any random string, THE SAME string pasted into
                        Code.gs at the top
   3. Paste this whole file into Supabase → SQL Editor → Run.
      Re-running is safe: it upgrades in place and never overwrites a
      real mailer_url/secret (guarded updates, same pattern as payment.sql).
   ══════════════════════════════════════════════════════════════════════ */

create extension if not exists pg_net;

insert into app_secrets (key, value) values
  ('mailer_url',    ''),
  ('mailer_secret', '')
on conflict (key) do nothing;

-- ▼▼▼ FILL THESE TWO (same values go into Code.gs / the web app URL) ▼▼▼
update app_secrets set value = 'PASTE-APPS-SCRIPT-EXEC-URL-HERE'
  where key = 'mailer_url' and (value = '' or value like 'PASTE-%');
update app_secrets set value = 'PASTE-A-MAILER-SECRET-HERE'
  where key = 'mailer_secret' and (value = '' or value like 'PASTE-%');
-- ▲▲▲ while mailer_url is empty or a placeholder, the hook stays silent
--     and mails simply queue in the console — current behaviour. ▲▲▲

-- ─────────────────────────────────────────────────────────────────────
   The trigger function: build a self-contained mail payload and fire it
   ───────────────────────────────────────────────────────────────────── */

create or replace function public.somun_mail_dispatch()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_url    text;
  v_secret text;
  v_body   jsonb;
begin
  select nullif(value, '') into v_url    from app_secrets where key = 'mailer_url';
  select value           into v_secret   from app_secrets where key = 'mailer_secret';

  -- not configured yet (or still a placeholder): queue-only, send nothing
  if v_url is null or v_url like 'PASTE-%' then
    return new;
  end if;

  select jsonb_build_object(
    'secret',      v_secret,
    'mail_id',     new.id,
    'to',          new.to_email,
    'template',    new.template,
    'name',        r.full_name,
    'ref_code',    r.ref_code,
    'amount',      to_char(r.expected_amount, 'FM999999990.00'),
    'tier',        r.tier,
    'institution', r.institution,
    'pref1',       r.committee_pref1,
    'paid_at',     r.paid_at,
    'reason',      r.status_note
  )
  into v_body
  from registrations r
  where r.id::text = new.registration_id;

  -- queue row without a matching registration (shouldn't happen): minimal payload
  if v_body is null then
    v_body := jsonb_build_object(
      'secret', v_secret, 'mail_id', new.id,
      'to', new.to_email, 'template', new.template
    );
  end if;

  perform net.http_post(
    url     := v_url,
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body    := v_body
  );

  return new;
end;
$$;

drop trigger if exists mail_queue_dispatch on mail_queue;
create trigger mail_queue_dispatch
  after insert on mail_queue
  for each row execute function public.somun_mail_dispatch();
