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
3. **Screenshot viewing** — two signing routes, storage-sign first: when the
   `http` extension is on (schema resolved from `pg_proc` at run time), storage
   itself signs the link with the `service_key` — a URL storage built is always
   valid. Fallback: the RPC signs the token in pure SQL (pgcrypto `hmac`, keyed
   by `jwt_secret`; the JWT `url` claim must be the **bare** `payment-shots/<file>`
   path) and proves the link with a storage GET before returning it. If neither
   route is ready the console says exactly which cell to fill. One-off upgrade
   for an older install: re-run `supabase/fix-view-payment.sql`.
4. **QR (built in)** — the pay panel generates a fresh QR per delegate with
   the exact watermark amount encoded inside; no image file needed.

## The delegate flow

Register (committee preference + its portfolio are **mandatory**; page 1
collects personal + emergency contact + dietary needs and an
**"Are you in a delegation?"** tick-box that reveals three more required
questions — delegation name, delegation head, delegation head's contact
number; page 4 records a referral if any) → confirmation screen shows
their **personal exact amount** (₹2799.63-style) → **scan the QR** with any
UPI app — the amount is already on it — or copy the UPI ID + amount →
submit the UTR + payment screenshot (both required, front and back end) →
a full-screen tick confirms **"Payment sent for verification — please wait
for the confirmation email (usually less than 12 hours)"** and returns
them to the home page (after 7 seconds, or instantly via **Done**) →
status stays **verifying** until you confirm.

## The secretariat flow (`#/verify`, console key)

The console is two pages behind one key — switch with the tabs at the top:

- **Payment desk** — everything below: the meter, the UTR books, the
  outbox, the bank feed.
- **All registrants** — the verified-delegates register
  (`pay_admin_registrants`, section 8c of payment.sql): only rows whose
  payment is **confirmed (paid)** appear here — registered date, ref code,
  name, email, phone, emergency contact, grade, institution, delegation
  (name · head · head's phone), dietary flag, experience, past MUNs,
  achievements, committee prefs I–III with their portfolios, referral,
  fee, UTR and the verified-on date. **View payment** under the UTR opens
  the delegate's submitted screenshot in the popup lightbox. The filter
  box narrows live across every column, and **Export CSV** downloads
  exactly what you see (Excel-ready, UTF-8 BOM) for allocation day.

- **Sales meter** at the top: Invoiced · Confirmed · Awaiting.
- **Payments awaiting verification**: each row shows the invoice amount,
  declared UTR, the delegate's committee + portfolio preference and any
  dietary flag. **View payment** opens the delegate's submitted screenshot
  in a popup inside the page (signed 1-hour URL — the bucket stays private;
  an "open raw" link remains as fallback). Click
  **Verify** when the UTR + screenshot + your bank app all agree — that
  flips paid and queues the confirmation email.
- **Search**: every book (pending · verified · rejected) has its own search
  box — type a name, ref code, email or UTR and that whole book is searched
  server-side (`pay_admin_search`, supabase/search-reject-mail.sql), not
  just the recent 20. "Show recent" clears the search.
- **Confirmation emails**: the outbox — every mail shows its kind
  (confirmation / rejection notice) and its true state: `sent <time>`,
  `hook not configured …` (finish MAIL-SETUP step 3, then Requeue),
  `handed to the mailer · attempt N` (Supabase fired it; if it sticks,
  see MAIL-SETUP "Why is a mail still waiting?"), or `waiting to send`.
  **Requeue** re-fires the latest mail for that delegate no matter what
  state it is in.
- **Verified / Rejected payments**: the two books. Rejected rows keep their
  rejection reason and a **Restore** button that puts the row back into the
  waiting queue (reason cleared); verified rows can be reverted the same
  way. Both books get **View payment** too, so a shot can be re-opened
  after the fact.
- **Rejection mails**: clicking **Reject** demands a reason (cancel aborts).
  The row is stored with that reason AND a `payment_rejected` mail is
  queued — the hook (mailer-hook.sql) posts it with the reason to the Apps
  Script mailer, which sends the delegate a branded notice: the reason, the
  invoice, and somunpr@gmail.com to discuss it further. Update Code.gs and
  re-deploy the web app (Deploy → Manage deployments → New version) to get
  the rejection template.

> The old paste-a-bank-statement credits desk was retired: with a mandatory
> screenshot + UTR per row, the secretariat verifies each payment directly
> against their bank app. The `credits` machinery still exists in the
> database, just without console furniture.

## Trust ladder (unchanged contract)

Screenshot = claim · your click after checking UTR + screenshot + bank app
= proof. A fabricated UTR still trips the unique-UTR index; a wrong amount
is visible at a glance against the invoice. The bank credit cannot be fooled.

## Limits worth knowing

- 99 unique paise slots per tier among **live** (unpaid) rows; a verified
  row frees its suffix. Early-bird capacity is effectively 99 concurrently
  pending payments — reconcile batches to keep slots free.
- UPI apps let the payer *edit* the prefilled amount. That is fine: editing
  breaks the watermark and the matcher flags it. The copy tells delegates
  to pay the exact amount.
- `mail_queue` is the outbox (rows appear in the console). For fully
  automated delivery from your own Gmail, see `supabase/MAIL-SETUP.md`
  (+ `mailer-hook.sql` + `apps-script/Code.gs`) — free, no domain needed.
  Until that is wired, the panel is your send list.
