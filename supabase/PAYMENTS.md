# SOMUN '26 — Payments (unique-amount watermark scheme)

No gateway, no KYC, no bank phone. Every registration is invoiced the base
fee **plus a unique paise suffix** — early bird ₹2799 becomes ₹2799.63 for
one delegate, ₹2799.07 for the next. The paise are the payment's identity.

## Why this works

- One UPI transaction = one amount + one UTR → it can only ever satisfy
  **one** registration. Paying once and seating three friends is structurally
  impossible.
- Screenshot reuse dies automatically: a friend's screenshot shows *their*
  unique amount, which fails *your* check when you open it.
- Every submission carries a **mandatory UTR + screenshot** (enforced in the
  browser AND in the database).
- The console keeps a live sales meter: invoiced vs confirmed, always
  computed from the rows, never stale.

## Install (one-time, ~10 minutes)

1. **Database** — open Supabase → SQL Editor, paste `payment.sql` whole, Run.
   The file is idempotent: re-running upgrades in place and **never
   overwrites a real secret** (its updates only fire while a cell is still
   empty / still says `PASTE-…`).
   Then fill the rows in **Table Editor → `app_secrets`**:
   - `payee_vpa` → the conference UPI id (e.g. `somun26@ybl`)
   - `admin_key` → any long random string — the `#/verify` console key
     (do this **before** sharing the site: the placeholder is guessable)
   - `project_url` → your project URL (`Settings → API`, e.g. `https://abcdefgh.supabase.co`)
   - `service_key` → the `service_role` key (`Settings → API`) — lets the
     console open delegates' screenshots without ever exposing the key or
     the private bucket
   - `jwt_secret` → the `JWT Secret` on the same `Settings → API` page —
     the console signs each screenshot's 1-hour viewing token with it
2. **Fee** — already live in `js/config.js` (`REGISTRATION_FEE: 2799`).
   Change `fee_base_early` in `app_secrets` when a new round is priced.
3. **AI assistant (optional)** — get a key at aistudio.google.com, then
   ```
   supabase functions deploy check-payment-shot
   supabase secrets set GEMINI_API_KEY=...
   ```
   No key → the site simply skips the AI read, everything else works.
4. **Screenshot viewing** — two signing routes, storage-sign first: when the
   `http` extension is on (schema resolved from `pg_proc` at run time), storage
   itself signs the link with the `service_key` — a URL storage built is always
   valid. Fallback: the RPC signs the token in pure SQL (pgcrypto `hmac`, keyed
   by `jwt_secret`; the JWT `url` claim must be the **bare** `payment-shots/<file>`
   path) and proves the link with a storage GET before returning it. If neither
   route is ready the console says exactly which cell to fill. One-off upgrade
   for an older install: re-run `supabase/fix-view-payment.sql`.
5. **QR (built in)** — the pay panel generates a fresh QR per delegate with
   the exact watermark amount encoded inside; no image file needed.

## The delegate flow

Register (committee preference + country/portfolio preference are
**mandatory**, stage IV collects allergies) → confirmation screen shows
their **personal exact amount** (₹2799.63-style) → **scan the QR** with any
UPI app — the amount is already on it — or copy the UPI ID + amount →
submit the UTR + payment screenshot (both required, front and back end) →
the AI (if wired) reads the shot and flags match/mismatch inline → status
stays **verifying** until you confirm.

## The secretariat flow (`#/verify`, console key)

- **Sales meter** at the top: Invoiced · Confirmed · Awaiting · AI-matched.
- **Payments awaiting verification**: each row shows the invoice amount,
  declared UTR, the delegate's committee + portfolio preference and any
  allergy flag. **View payment** opens the delegate's submitted screenshot
  in a popup inside the page (signed 1-hour URL — the bucket stays private;
  an "open raw" link remains as fallback). Click **Verify** when the
  UTR + screenshot + your bank app all agree — that flips paid and queues
  the confirmation email.
- **Confirmation emails**: the outbox — waiting to send / sent times, with
  a Requeue button per delegate.
- **Recently verified / Rejected payments**: the two books. Rejected rows
  keep their rejection reason and a **Restore** button that puts the row
  back into the waiting queue (reason cleared); verified rows can be
  reverted the same way. Both books get **View payment** too, so a shot
  can be re-opened after the fact.

> The old paste-a-bank-statement credits desk was retired: with a mandatory
> screenshot + UTR per row, the secretariat verifies each payment directly
> against their bank app. The `credits` machinery still exists in the
> database, just without console furniture.

## Trust ladder (unchanged contract)

Screenshot = claim · AI read = consistency check (advisory, never flips
paid) · your click after checking UTR + screenshot + bank app = proof.
A fabricated UTR still trips the unique-UTR index; a wrong amount is
visible at a glance against the invoice.

## Limits worth knowing

- 99 unique paise slots per tier among **live** (unpaid) rows; a verified
  row frees its suffix. Early-bird capacity is effectively 99 concurrently
  pending payments — reconcile batches to keep slots free.
- UPI apps let the payer *edit* the prefilled amount. That is fine: editing
  breaks the watermark and the AI/matcher flags it. The copy tells delegates
  to pay the exact amount.
- `mail_queue` is the outbox (rows appear in the console). For fully
  automated delivery from your own Gmail, see `supabase/MAIL-SETUP.md`
  (+ `mailer-hook.sql` + `apps-script/Code.gs`) — free, no domain needed.
  Until that is wired, the panel is your send list.
