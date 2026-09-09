-- ══════════════════════════════════════════════════════════════════
  fix-view-payment.sql — "View payment" died with
  schema "http" does not exist

  Why: Supabase installs the http extension into its `extensions`
  schema — there is no schema literally named `http`, so the old
  function's http.http_post call could never resolve. This patch
  asks pg_extension where the extension actually lives at run time
  and calls it there; if the extension is still off, it installs
  itself into `extensions`.

  Run: whole file, once, in Supabase → SQL Editor. Idempotent —
  safe to re-run. Nothing else in the database is touched; the
  console's admin key, delegates and payments stay as they are.

  Then: back to the secretariat console → View payment again.
  The signed link opens in a new tab and is valid for 1 hour.
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
  v_ext := (select extschema::regnamespace::text from pg_extension where extname = 'http');
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

grant execute on function pay_admin_shot_url(text, text) to anon, authenticated;
