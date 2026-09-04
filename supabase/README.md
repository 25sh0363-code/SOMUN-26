# SOMUN '26 — Supabase backend

Static site + Supabase (database) + Cashfree (payments, via edge functions
so the secret key never reaches the browser).

## 1 · Create the tables (once, manual)

The anon key cannot run DDL, so:

1. Open the Supabase dashboard → **SQL Editor**
2. Paste **`supabase/schema.sql`** and run it
3. Done — `registrations` + `resources` tables, row-security rules and the
   public `resources` storage bucket now exist. The site's wizard and the
   resource downloads go live immediately (subject to the config gates).

## 2 · Deploy the payment functions (when Cashfree keys arrive)

```bash
supabase login
supabase link --project-ref gvhlbnyxysfhfwrflxsg
supabase secrets set CASHFREE_APP_ID=<app id>
supabase secrets set CASHFREE_SECRET_KEY=<secret key>
supabase secrets set CASHFREE_MODE=sandbox        # then "production" on go-live
supabase secrets set REGISTRATION_FEE=1499        # fallback fee in rupees
supabase secrets set SITE_URL=https://<your-site> # Cashfree return_url base
supabase functions deploy create-payment
supabase functions deploy verify-payment
```

Then in the site's `js/config.js`:

```js
CASHFREE_APP_ID: "<app id>",   // the public identifier may live client-side
REGISTRATION_FEE: 1499,        // unlocks the fee display + pay button
```

`CASHFREE_SECRET_KEY` stays out of the repo/site entirely — the blank field
in `config.js` is a reminder slot only.

## 3 · How the flow works

```
wizard submit ──▶ POST /rest/v1/registrations      (anon insert, RLS-gated)
success box ────▶ "Pay online now"
                    │
                    ▼
        POST /functions/v1/create-payment          (edge fn, service role)
                    │  reads row, creates Cashfree order, stores order id
                    ▼
        Cashfree SDK modal (UPI / cards / netbanking)
                    │
                    ▼
        POST /functions/v1/verify-payment          (edge fn asks Cashfree)
                    │  PAID → row.payment_status = 'paid', paid_at set
                    ▼
        success box flips to "Payment received"
```

While `CASHFREE_APP_ID` is blank or `REGISTRATION_FEE` is 0, every payment
surface stays dormant: stage III shows the "to be disclosed" panel and the
success box hides its pay button. Visitors see no errors.

## 4 · Day-to-day ops

- **View registrations**: Table Editor → `registrations` (newest first via
  `created_at`); `payment_status` column tracks who has paid.
- **Release a study guide**: upload the PDF to Storage → `resources` bucket,
  copy its public URL into a `resources` row (`category` = `study-guides` /
  `rules` / `handbook`, or `committee` = `UNHRC` etc.), set `released = true`.
