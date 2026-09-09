# SOMUN '26 — Payments (unique-amount watermark scheme)

No gateway, no KYC, no bank phone. Every registration is invoiced the base
fee **plus a unique paise suffix** — early bird ₹2799 becomes ₹2799.63 for
one delegate, ₹2799.07 for the next. The paise are the payment's identity.

## Why this works

- One UPI transaction = one amount + one UTR → it can only ever satisfy
  **one** registration. Paying once and seating three friends is structurally
  impossible.
- Screenshot reuse dies automatically: a friend's screenshot shows *their*
  unique amount, which fails *your* AI check.
- A missing amount in the bank statement names **exactly** who didn't pay.
- The console keeps a live sales meter: invoiced vs confirmed, always
  computed from the rows, never stale.

## Install (one-time, ~10 minutes)

1. **Database** — open Supabase → SQL Editor, paste `payment.sql` whole, Run.
   The file is idempotent: re-running upgrades in place and **never
   overwrites a real secret** (its updates only fire while a cell is still
   empty / still says `PASTE-…`).
   Then fill the two rows in **Table Editor → `app_secrets`**:
   - `payee_vpa` → the conference UPI id (e.g. `somun26@ybl`)
   - `admin_key` → any long random string — the `#/verify` console key
     (do this **before** sharing the site: the placeholder is guessable)
2. **Fee** — already live in `js/config.js` (`REGISTRATION_FEE: 2799`).
   Change `fee_base_early` in `app_secrets` when a new round is priced.
3. **AI assistant (optional)** — get a key at aistudio.google.com, then
   ```
   supabase functions deploy check-payment-shot
   supabase secrets set GEMINI_API_KEY=...
   ```
   No key → the site simply skips the AI read, everything else works.
4. **QR image (optional)** — drop the school QR at `images/payment-qr.png`.
   The "Pay via app" button (deep link with the amount locked in) works
   without any image.

## The delegate flow

Register → confirmation screen shows their **personal exact amount**
(₹2799.63-style) → *Pay via app* opens GPay/PhonePe/Paytm with the amount
prefilled (desktop shows the QR + UPI id) → submit UTR + screenshot →
the AI reads the screenshot and flags match/mismatch inline → status stays
**verifying** until you confirm.

## The secretariat flow (`#/verify`, console key)

- **Sales meter** at the top: Invoiced · Confirmed · Awaiting · AI-matched.
- **Pending UTRs**: each row shows the invoice amount, declared UTR and the
  AI badge (✓ consistent / ⚠ mismatch / ? unreadable). Click **Verify** when
  satisfied — that flips paid and queues the confirmation mail.
- **Reconcile later**: paste the bank statement's credit lines into the
  ingest box. Every line auto-matches by UTR first, then by its unique
  amount, and flips the row. One paste can settle a whole batch.
- **Spot-checks**: screenshots live in Storage → `payment-shots` (private).
  Open one whenever a row looks odd.

## Trust ladder (unchanged contract)

Screenshot = claim · AI read = consistency check (advisory, never flips
paid) · bank statement / your click = proof. A fabricated UTR still trips
the unique-UTR index and surfaces at statement reconcile.

## Limits worth knowing

- 99 unique paise slots per tier among **live** (unpaid) rows; a verified
  row frees its suffix. Early-bird capacity is effectively 99 concurrently
  pending payments — reconcile batches to keep slots free.
- UPI apps let the payer *edit* the prefilled amount. That is fine: editing
  breaks the watermark and the AI/matcher flags it. The copy tells delegates
  to pay the exact amount.
- `mail_queue` is the outbox (rows appear in the console). Wire a Database
  Webhook on `mail_queue` insert to any mailer when you want automated
  delivery — until then the panel is your send list.
