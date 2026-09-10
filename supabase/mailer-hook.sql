-- ══════════════════════════════════════════════════════════════════════
   SOMUN '26 — AUTOMATED MAIL HOOK v3 (mail_queue → your Gmail via Apps Script)
   ══════════════════════════════════════════════════════════════════════
   When a payment verifies (or a rejection reason is saved) a row lands
   in mail_queue. This trigger hands it to your Google Apps Script web
   app, which sends the mail from your own Gmail.

   WHAT v3 FIXES OVER THE OLD FILE — re-run this even if you installed
   the earlier version:
   · mails now SAY why they are waiting — the console outbox shows
     "hook not configured" instead of a silent forever-"waiting" stamp;
   · Requeue actually re-fires now (the trigger also listens to the
     requeue update, not only to fresh inserts);
   · the Apps Script marking a mail "sent" can no longer loop the hook.

   INSTALL (full walkthrough in supabase/MAIL-SETUP.md):
   1. Create the Apps Script (supabase/apps-script/Code.gs) and deploy it
      as a Web app — you get a script.google.com/.../exec URL.
      Re-deploy a NEW VERSION if your Code.gs predates the rejection
      template — otherwise rejection notices are skipped.
   2. Fill the two updates below (or edit the rows later in
      Table Editor → app_secrets):
        mailer_url    → the …/exec URL from step 1
        mailer_secret → any random string, THE SAME string pasted into
                        Code.gs at the top
   3. Paste this whole file into Supabase → SQL Editor → Run.
      Re-running is safe: it upgrades in place and never overwrites a
      real mailer_url/secret (guarded updates, same pattern as payment.sql).
   4. Already-queued mails do not fire retroactively — open the console
      outbox and hit Requeue once after configuring.
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
-- ▲▲▲ while mailer_url is empty or a placeholder, the hook marks every
--     queued mail "hook not configured" in the console outbox. ▲▲▲

alter table mail_queue add column if not exists last_error text;

-- ─────────────────────────────────────────────────────────────────────
   The trigger function — master copy lives in payment.sql and is kept
   byte-identical by scripts/build_patch_sql.py. Do not hand-edit here.
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

  if v_url is null or v_url like 'PASTE-%' then
    update mail_queue set last_error = 'Mailer hook is not configured yet — paste the Apps Script web-app URL into app_secrets → mailer_url (supabase/MAIL-SETUP.md), then hit Requeue. The mail stays queued, nothing is lost.'
      where id = new.id;
    return new;
  end if;

  if tg_op = 'UPDATE' and new.sent_at is not null then
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

  if v_body is null then
    v_body := jsonb_build_object(
      'secret', v_secret, 'mail_id', new.id,
      'to', new.to_email, 'template', new.template
    );
  end if;

  update mail_queue set attempts = attempts + 1, last_error = null where id = new.id;

  perform net.http_post(
    url     := v_url,
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body    := v_body
  );

  return new;
end $$;

-- insert fires for fresh mails; "update of sent_at" fires when the
-- console requeues (sent_at → null) — but NOT when Apps Script marks
-- the mail sent (dispatch ignores updates that set a non-null sent_at).
drop trigger if exists mail_queue_dispatch on mail_queue;
create trigger mail_queue_dispatch
  after insert or update of sent_at on mail_queue
  for each row execute function public.somun_mail_dispatch();
