insert into app_secrets (key, value)
values ('jwt_secret', 'PASTE-YOUR-JWT-SECRET-HERE')
on conflict (key) do nothing;
update app_secrets set value = 'PASTE-YOUR-JWT-SECRET-HERE'
  where key = 'jwt_secret' and (value = '' or value like 'PASTE-%');

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
        select m.id::text, m.registration_id, m.to_email, m.template,
               m.attempts, m.last_error, m.created_at, m.sent_at,
               r.full_name, r.ref_code
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

create or replace function pay_admin_requeue(p_key text, p_registration text)
returns void
language plpgsql security definer set search_path = public as $$
declare v_id registrations.id%TYPE; v_email text;
begin
  perform somun_guard(p_key);
  select id, email into v_id, v_email from registrations where id::text = p_registration;
  if not found then raise exception 'Registration not found.'; end if;

  update mail_queue set sent_at = null, attempts = 0, last_error = null
   where registration_id = v_id::text
     and created_at = (select max(created_at) from mail_queue
                        where registration_id = v_id::text);
  if not exists (select 1 from mail_queue where registration_id = v_id::text and sent_at is null) then
    insert into mail_queue (registration_id, to_email) values (v_id::text, v_email);
  end if;
end $$;

alter table mail_queue add column if not exists last_error text;

grant execute on function pay_admin_shot_url(text, text) to anon, authenticated;
