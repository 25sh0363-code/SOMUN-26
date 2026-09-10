-- patch-delegation.sql — delegation questions + the delegation console
-- Run in the Supabase SQL editor (idempotent — safe to re-run).
-- Adds: registrations.delegation_name / delegation_head / delegation_head_phone,
-- register_delegate with the 3 delegation params (24 total),
-- pay_admin_registrants now returns ONLY verified (paid) SINGLE registrations
-- (delegation delegates are excluded — they live in the folder view),
-- pay_admin_delegations (folder source: every row under a delegation, any status),
-- pay_admin_delegation_delete (disband — releases every member to individual),
-- pay_admin_delegate_detach (move ONE delegate back to individual registration)
-- + grants for all of them.

alter table registrations add column if not exists delegation_name       text;
alter table registrations add column if not exists delegation_head       text;
alter table registrations add column if not exists delegation_head_phone text;

create or replace function register_delegate(
  p_ref_code        text default null,
  p_full_name       text default null,
  p_email           text default null,
  p_phone           text default null,
  p_institution     text default null,
  p_grade_or_title  text default null,
  p_emergency_name  text default null,
  p_emergency_phone text default null,
  p_experience      text default '0',
  p_exp_details     text default null,
  p_achievements    text default null,
  p_pref1           text default null,
  p_pref2           text default null,
  p_pref3           text default null,
  p_portfolio1      text default null,
  p_portfolio2      text default null,
  p_portfolio3      text default null,
  p_referred        boolean default false,
  p_referral_name   text default null,
  p_delegation_name       text default null,
  p_delegation_head       text default null,
  p_delegation_head_phone text default null,
  p_allergies       text default null,
  p_notes           text default null
) returns json
language plpgsql security definer set search_path = public as $$
declare
  v_ref text; v_base int; v_paise int := null; v_try int;
  v_vpa text; v_name text; v_id registrations.id%TYPE;
  v_portfolio text;
  v_alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
begin
  p_full_name       := nullif(trim(coalesce(p_full_name, '')), '');
  p_email           := lower(nullif(trim(coalesce(p_email, '')), ''));
  p_phone           := nullif(trim(coalesce(p_phone, '')), '');
  p_institution     := nullif(trim(coalesce(p_institution, '')), '');
  p_emergency_name  := nullif(trim(coalesce(p_emergency_name, '')), '');
  p_emergency_phone := nullif(trim(coalesce(p_emergency_phone, '')), '');
  p_experience      := coalesce(nullif(trim(coalesce(p_experience, '')), ''), '0');
  p_exp_details     := nullif(trim(coalesce(p_exp_details, '')), '');
  p_achievements    := nullif(trim(coalesce(p_achievements, '')), '');
  p_pref1           := nullif(trim(coalesce(p_pref1, '')), '');
  p_pref2           := nullif(trim(coalesce(p_pref2, '')), '');
  p_pref3           := nullif(trim(coalesce(p_pref3, '')), '');
  p_portfolio1      := nullif(trim(coalesce(p_portfolio1, '')), '');
  p_portfolio2      := nullif(trim(coalesce(p_portfolio2, '')), '');
  p_portfolio3      := nullif(trim(coalesce(p_portfolio3, '')), '');
  p_referral_name   := nullif(trim(coalesce(p_referral_name, '')), '');
  p_delegation_name       := nullif(trim(coalesce(p_delegation_name, '')), '');
  p_delegation_head       := nullif(trim(coalesce(p_delegation_head, '')), '');
  p_delegation_head_phone := nullif(trim(coalesce(p_delegation_head_phone, '')), '');
  p_allergies       := nullif(trim(coalesce(p_allergies, '')), '');
  p_notes           := nullif(trim(coalesce(p_notes, '')), '');

  if p_full_name is null or length(p_full_name) < 3 then
    raise exception 'Please share your full name.';
  end if;
  if p_email is null or p_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'That email doesn''t look right — please check it.';
  end if;
  if p_phone is null or length(regexp_replace(p_phone, '\D', '', 'g')) < 8 then
    raise exception 'Please enter a valid phone number.';
  end if;
  if p_emergency_name is null or length(p_emergency_name) < 3 then
    raise exception 'Please share a parent / guardian name for emergency contact.';
  end if;
  if p_emergency_phone is null or length(regexp_replace(p_emergency_phone, '\D', '', 'g')) < 8 then
    raise exception 'Please enter a valid parent / guardian phone number.';
  end if;
  if p_institution is null then
    raise exception 'Current institution is required.';
  end if;
  if p_experience !~ '^[0-9]{1,3}$' then
    p_experience := '0';
  end if;
  if p_pref1 is null then
    raise exception 'Please choose your first committee preference.';
  end if;
  if p_pref2 is not null and p_pref2 = p_pref1 then
    raise exception 'Your second committee preference repeats the first — pick a different chamber.';
  end if;
  if p_pref3 is not null and p_pref3 in (p_pref1, p_pref2) then
    raise exception 'Your third committee preference repeats an earlier one — pick a different chamber.';
  end if;
  if p_portfolio1 is null then
    raise exception 'Please enter your preferred portfolio for your first committee — browse the allocation matrix if you''re unsure.';
  end if;
  if p_pref2 is not null and p_portfolio2 is null then
    raise exception 'Please enter your preferred portfolio for your second committee too.';
  end if;
  if p_pref3 is not null and p_portfolio3 is null then
    raise exception 'Please enter your preferred portfolio for your third committee too.';
  end if;
  if p_referred and p_referral_name is null then
    raise exception 'You marked a referral — please enter the full name of the person who referred you.';
  end if;
  if not p_referred then
    p_referral_name := null;
  end if;
  if p_delegation_name is not null or p_delegation_head is not null
     or p_delegation_head_phone is not null then
    if p_delegation_name is null or length(p_delegation_name) < 2 then
      raise exception 'Please enter the name of your delegation.';
    end if;
    if p_delegation_head is null or length(p_delegation_head) < 3 then
      raise exception 'Please enter the name of your delegation head.';
    end if;
    if p_delegation_head_phone is null
       or length(regexp_replace(p_delegation_head_phone, '\D', '', 'g')) < 8 then
      raise exception 'Please enter a valid contact number for your delegation head.';
    end if;
  end if;

  -- one readable portfolio cell for the console + mails
  v_portfolio := nullif(concat_ws(' · ', p_portfolio1, p_portfolio2, p_portfolio3), '');

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
           emergency_name, emergency_phone, experience, exp_details, achievements,
           committee_pref1, committee_pref2, committee_pref3,
           portfolio1, portfolio2, portfolio3, portfolio,
           referred, referral_name, delegation_name, delegation_head, delegation_head_phone,
           allergies, notes,
           tier, fee_base, expected_paise, expected_amount, payment_status)
        values
          (v_ref, p_full_name, p_email, p_phone, p_institution, p_grade_or_title,
           p_emergency_name, p_emergency_phone, p_experience, p_exp_details, p_achievements,
           p_pref1, p_pref2, p_pref3,
           p_portfolio1, p_portfolio2, p_portfolio3, v_portfolio,
           p_referred, p_referral_name, p_delegation_name, p_delegation_head, p_delegation_head_phone,
           p_allergies, p_notes,
           'early', v_base, v_paise, v_base + v_paise / 100.0, 'registered')
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
       emergency_name, emergency_phone, experience, exp_details, achievements,
       committee_pref1, committee_pref2, committee_pref3,
       portfolio1, portfolio2, portfolio3, portfolio,
       referred, referral_name, delegation_name, delegation_head, delegation_head_phone,
       allergies, notes,
       tier, fee_base, payment_status)
    values
      (v_ref, p_full_name, p_email, p_phone, p_institution, p_grade_or_title,
       p_emergency_name, p_emergency_phone, p_experience, p_exp_details, p_achievements,
       p_pref1, p_pref2, p_pref3,
       p_portfolio1, p_portfolio2, p_portfolio3, v_portfolio,
       p_referred, p_referral_name, p_delegation_name, p_delegation_head, p_delegation_head_phone,
       p_allergies, p_notes,
       'early', null, 'registered')
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

create or replace function pay_admin_registrants(p_key text)
returns json
language plpgsql stable security definer set search_path = public as $$
begin
  perform somun_guard(p_key);

  return coalesce((
    select json_agg(x) from (
      select id::text, created_at, ref_code, full_name, email, phone,
             institution, grade_or_title, experience,
             emergency_name, emergency_phone,
             exp_details, achievements, allergies,
             committee_pref1, committee_pref2, committee_pref3,
             portfolio1, portfolio2, portfolio3, portfolio,
             referred, referral_name,
             payment_status, expected_amount, upi_utr, utr_submitted_at,
             paid_at, status_note, shot_path
        from registrations
       where payment_status = 'paid'
         and delegation_name is null
       order by created_at desc
       limit 5000) x), json_build_array());
end $$;

create or replace function pay_admin_delegations(p_key text)
returns json
language plpgsql stable security definer set search_path = public as $$
begin
  perform somun_guard(p_key);

  return coalesce((
    select json_agg(x) from (
      select id::text, created_at, ref_code, full_name, email, phone,
             institution, grade_or_title, experience,
             delegation_name, delegation_head, delegation_head_phone,
             committee_pref1, committee_pref2, committee_pref3,
             portfolio, portfolio1, portfolio2, portfolio3,
             payment_status, expected_amount, upi_utr, utr_submitted_at,
             paid_at, status_note, shot_path
        from registrations
       where delegation_name is not null
       order by delegation_name, created_at desc
       limit 5000) x), json_build_array());
end $$;

create or replace function pay_admin_delegation_delete(p_key text, p_name text)
returns json
language plpgsql security definer set search_path = public as $$
declare
  v_moved int;
  v_name  text;
begin
  perform somun_guard(p_key);
  v_name := nullif(trim(coalesce(p_name, '')), '');
  if v_name is null then
    raise exception 'No delegation name given.';
  end if;

  update registrations
     set delegation_name = null, delegation_head = null, delegation_head_phone = null
   where delegation_name = v_name;
  get diagnostics v_moved = row_count;
  if v_moved = 0 then
    raise exception 'No delegates found under the exact name % — folders split on every capital letter, so re-check the spelling on the folder you meant.', v_name;
  end if;
  return json_build_object('moved', v_moved);
end $$;

create or replace function pay_admin_delegate_detach(p_key text, p_registration text)
returns json
language plpgsql security definer set search_path = public as $$
declare
  v_id registrations.id%TYPE;
  v_name text;
begin
  perform somun_guard(p_key);
  select id, delegation_name into v_id, v_name
    from registrations where id::text = p_registration;
  if not found then raise exception 'Registration not found.'; end if;
  if v_name is null then
    raise exception 'That delegate is not registered under a delegation.';
  end if;

  update registrations
     set delegation_name = null, delegation_head = null, delegation_head_phone = null
   where id = v_id;
  return json_build_object('moved', 1, 'from', v_name);
end $$;

grant execute on function
  register_delegate(text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, boolean, text, text, text, text, text, text)
  to anon, authenticated;
grant execute on function
  pay_admin_registrants(text)
  to anon, authenticated;
grant execute on function
  pay_admin_delegations(text)
  to anon, authenticated;
grant execute on function
  pay_admin_delegation_delete(text, text)
  to anon, authenticated;
grant execute on function
  pay_admin_delegate_detach(text, text)
  to anon, authenticated;
