insert into app_secrets (key, value)
values ('gemini_api_key', 'PASTE-YOUR-GEMINI-API-KEY-HERE')
on conflict (key) do nothing;
update app_secrets set value = 'PASTE-YOUR-GEMINI-API-KEY-HERE'
  where key = 'gemini_api_key' and (value = '' or value like 'PASTE-%');

do $$ begin
  if not exists (select 1 from pg_extension where extname = 'http') then
    create schema if not exists extensions;
    execute 'create extension http with schema extensions';
  end if;
exception when others then
  null;
end $$;

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

grant execute on function submit_payment_utr(text, text, numeric, text) to anon, authenticated;
grant execute on function check_shot_ai(text) to anon, authenticated;
