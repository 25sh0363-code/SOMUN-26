# SOMUN '26 — Supabase backend

Static site + Supabase (database) + payments. **The school's PAN/KYC is not
available, so there is no payment gateway** — the fee is paid to the
conference UPI QR and verified **automatically** by the database (see
`PAYMENT-SETUP.md`). The dormant Cashfree path at the bottom stays for the
day KYC details ever arrive.

## 1 · Create the tables (once, manual)

The anon key cannot run DDL, so:

1. Open the Supabase dashboard → **SQL Editor**
2. Paste **`supabase/schema.sql`** and run it (registrations + resources
   tables, row security, the public `resources` bucket)
3. Paste **`supabase/payment-setup.sql`** and run it (payment verification:
   UTR columns, `payment_credits` feed, `mail_queue`, matching triggers,
   RPCs, the private `payment-shots` bucket)
4. Set your two keys (SQL Editor, one line each — see PAYMENT-SETUP.md § 1):
   `app_secrets.admin_key` unlocks `#/verify`; `app_secrets.ingest_key` goes
   into the SMS-forwarder app.

## 2 · How verification works (no gateway)

```
wizard submit ──▶ POST /rest/v1/registrations       (anon insert, RLS-gated)
success box ────▶ Scan·Pay·Confirm: conference QR + exact fee
                  delegate submits the UPI transaction id (UTR)
                        │
                        ▼
        rpc/submit_payment_utr                      (anon, secret-checked)
                  ┌──────────────────────────────────┘
  treasurer's phone: bank "credited" SMS → SMS-forwarder app
        │
        ▼
        rpc/ingest_credit                           (ingest_key-checked)
        parser extracts AMOUNT + UTR from the SMS
                  │
                  ▼
        matcher: exact UTR, or unambiguous amount+time window
                  │  match → registrations.payment_status = 'paid'
                  ▼
        mail_queue row → Database Webhook → Brevo → confirmation mail
```

Both time orders work (credit first or UTR first). Anything the matcher
can't decide stays in the feed for the console.

## 3 · The console — `#/verify`

Secretariat-only page (no nav link, share by URL). Unlocks with
`admin_key`. Manual verify / reject / bind-a-credit / ignore, the raw feed,
the mail queue with requeue, and a paste-a-SMS fallback box. Polls 20 s.

## 4 · Day-to-day ops

- **View registrations**: Table Editor → `registrations`
  (`payment_status` = `pending` / `paid` / `failed`).
- **Confirmation mails**: fire from `mail_queue` via the Database Webhook
  (Brevo) — set up once, PAYMENT-SETUP.md § 3. Resend from the console.
- **Release a study guide**: unchanged — upload PDF to Storage → `resources`
  bucket, point a `resources` row at it, set `released = true`.
- **Screenshots**: private `payment-shots` bucket — view from Dashboard →
  Storage; delegates can only upload, nobody can read via the anon key.

## 5 · Dormant Cashfree path (only if KYC ever arrives)

```bash
supabase secrets set CASHFREE_APP_ID=… CASHFREE_SECRET_KEY=… CASHFREE_MODE=…
supabase functions deploy create-payment && supabase functions deploy verify-payment
```

then set `CASHFREE_APP_ID` + `REGISTRATION_FEE` in `js/config.js` — the
gateway checkout button replaces the QR panel automatically (`payFlow()`
prefers Cashfree while an app id is present).
