alter table mail_queue add column if not exists last_error text;

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
               utr_submitted_at, status_note, shot_path
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

grant execute on function pay_admin_search(text, text, text) to anon, authenticated;
