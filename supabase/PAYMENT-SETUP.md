# SOMUN '26 — Payment automation (UPI QR · no gateway)

The school can't share PAN/KYC, so there is **no payment gateway**. Delegates
pay the conference **UPI QR** and this pipeline **verifies every payment
automatically** before the confirmation mail goes out.

```
delegate scans QR → pays exact fee → submits UTR (+ screenshot)
                                          │
the bank's "Rs X credited" signal reaches
the feed one of three ways (§ 2) ─────────┤
                                          ▼
                    Supabase parses AMOUNT + UTR from every credit
                                          │
                UTR match (exact)  or  amount match (only if unambiguous)
                                          ▼
             registrations.payment_status = 'paid'
                                          ▼
             mail_queue row → Database Webhook → Brevo → confirmation mail
```

Works in both time orders — credit first **or** UTR first. Every match,
including manual ones, is logged on the row (`status_note`).

---

## 1 · Install (once — 2 minutes)

1. Supabase dashboard → **SQL Editor** → paste **`supabase/payment-setup.sql`** → Run.
   This installs the whole verification brain AND `register_delegate()` —
   the wizard now submits registrations through that SECURITY DEFINER door
   (server-side validation, ref-code deconfliction), so registration stops
   depending on the bare anon-insert policy of `schema.sql`.
2. Still in the SQL Editor, set your two keys (make them long random strings):

```sql
update public.app_secrets set value = 'PASTE-A-LONG-RANDOM-STRING'
  where name = 'admin_key';    -- unlocks #/verify on the site
update public.app_secrets set value = 'PASTE-ANOTHER-RANDOM-STRING'
  where name = 'ingest_key';   -- goes into the SMS-forwarder app
```

3. In `js/config.js`:

```js
REGISTRATION_FEE: 1499,            // ← the announced fee (0 keeps payment dormant)
UPI_QR: {
  IMAGE: "images/payment-qr.png",  // ← drop the QR screenshot at this path
  UPI_ID: "xxxxx@ybl",             // ← the VPA printed under the QR (copyable on the page)
  PAYEE_NAME: "SOMUN '26",
},
```

That's it — stage III of the wizard explains the QR flow, and the success
box after registration shows **Scan · Pay · Confirm** with the QR, the exact
amount and a UTR field.

## 2 · Feed the bank credits — pick the mode that matches your access

The matcher only needs the *text* of each credit. Three ways to get it in —
any one is enough, and you can switch any time.

### Mode A · You control the bank phone → automate it (best)

1. On the phone that receives the receiving bank's credit SMS, install a
   free forwarder (Play Store: **"SMS Forwarder"**, or MacroDroid).
2. Forward rule: messages from your bank's sender ID (e.g. `HDFCBK`, `SBIN`,
   `AXISBK`) → **HTTP POST**:
   - URL: `https://gvhlbnyxysfhfwrflxsg.supabase.co/rest/v1/rpc/ingest_credit`
   - Headers: `Content-Type: application/json`
   - Body template (map the app's variables for sender / message):

```json
{
  "p_key": "YOUR-INGEST-KEY",
  "p_src": "sms",
  "p_sender": "<sender>",
  "p_body": "<message>"
}
```

Only **credit** SMS should be forwarded (debit texts are ignored by the
parser anyway — `debited / sent to / paid to` bodies never match).
Nothing matched stays in the feed for the console (§ 5).

### Mode B · The bank phone belongs to the school → borrow its signal

No access to the device — you only hold the QR and the UPI ID? The feed
doesn't care where the text comes from. Ask the one person who CAN see the
account (the coordinator whose phone gets the SMS, the bursar, whoever can
pull a statement) to forward each credit to you — the raw SMS text is ideal,
but a statement line (`UPI/CR/331234567812/NAME/INR 1,499.00`) parses too.
Open `#/verify` → **"Paste a credit SMS manually"** → paste → Ingest: the
same parser extracts amount + UTR, the same matcher flips the registration,
the same mail goes out. A 30-second ritual each evening during the
registration window; delegates never notice the difference.

### Mode C · Nobody at the school cooperates → verify by eye

Then nothing auto-verifies — and crucially nothing auto-confirms either:
without a credit in the feed no row can reach `paid` on its own, so no
goodies ever ship by accident. Your evidence lives on the site already:
delegates submit the UTR and attach the UPI success screenshot into the
**private** `payment-shots` bucket (make it mandatory by setting
`REQUIRE_PAYMENT_SHOT: true` in `js/config.js`). Then either:

- open Supabase Dashboard → Storage → `payment-shots`, check each screenshot
  (payee VPA, amount, UTR) and hit **Verify** on the matching pending row in
  the console — the mail fires exactly as the auto-matcher would have; or
- wait for whatever statement the school eventually shows you, paste those
  lines in the console, let the matcher do it.

Made a mistake? **Revert** on a verified row undoes it and clears the mail.
Reconcile monthly against the bank statement — nothing else changes.

## 3 · Confirmation mail (Brevo, free tier — 5 minutes)

The moment a registration turns `paid`, a row lands in `mail_queue`.

1. Create a free account at **brevo.com** → SMTP & API → generate an **API key**.
   Send from your secretariat address — Brevo verifies the sender by email,
   no domain DNS needed.
2. Supabase dashboard → **Database → Webhooks → Create**:
   - Table `mail_queue` · Event **Insert**
   - Method POST · URL `https://api.brevo.com/v3/smtp/email`
   - Headers: `api-key: <BREVO_API_KEY>`, `Content-Type: application/json`
   - Body (the webhook editor accepts `{{record.…}}` variables):

```json
{
  "sender": { "name": "SOMUN '26", "email": "somundelaffairs@gmail.com" },
  "to": [{ "email": "{{record.to_email}}" }],
  "subject": "SOMUN '26 — payment confirmed · {{record.payload.ref_code}}",
  "htmlContent": "<div style='font-family:Georgia,serif;background:#0d0a08;color:#ece1cb;padding:32px'><h1 style='color:#c8102e'>Payment received, {{record.payload.name}}.</h1><p>Your SOMUN '26 registration <b>{{record.payload.ref_code}}</b> is verified and your seat is locked in.</p><p>Fee settled: <b>₹{{record.payload.amount}}</b> · UTR {{record.payload.utr}}</p><p>Allocations and background guides follow over email. Words, not war.</p></div>"
}
```

If the webhook editor won't template variables, point the webhook at a free
Make.com scenario instead (Webhook → Brevo "Send an email" module) — same
queue, no other changes. Re-sending later: console → **Requeue mail**.

## 4 · The console — `#/verify`

Not linked anywhere; share the URL only with the secretariat. Unlock with
`admin_key`. One screen shows:

- **stats** — pending UTRs · paid · failed · unmatched credits · mails waiting
- **Payments awaiting verification** — every pending UTR (declared amount,
  code, contact) with **Verify · Reject · Reset**. Verify/Reject fires or
  cancels the confirmation mail exactly like the auto-matcher would.
- **Bank credit feed** — every SMS ingested, parsed amount + UTR, who it was
  consumed by; **Bind** an unmatched credit to any pending delegate by hand,
  **Ignore** a stray transfer. Plus the manual paste box.
- **Mail queue** — what was queued for Brevo, with **Requeue**.

The page polls every 20 s while open.

## 5 · How matching decides (so you can trust it)

- **UTR path** — the delegate's UTR equals the UTR parsed from a credit SMS:
  decisive, verified instantly.
- **Amount path** (when the SMS carries no UTR) — fires only when exactly one
  pending registration has that amount and it was created in the 72 h before
  the credit; any ambiguity leaves it unmatched for the console.
- One UTR can never verify two registrations (unique index).
- No feed at all (Mode C)? Then a UTR claim alone can never flip a row —
  `paid` happens only when a credit lands in the feed or you press Verify.
- Screenshots upload to the **private** `payment-shots` bucket (no public
  read) — view them from Dashboard → Storage; the console lists the paths.

## 6 · Test drill (do this before opening registrations)

1. Set `REGISTRATION_FEE: 100` temporarily; register on the site with your
   own details → success box shows the QR panel.
2. Pay ₹100 from your own UPI to the conference QR.
3. Forward that bank credit SMS (or paste it in the console).
4. Enter the UTR in the success box → within seconds it should flip to
   **"Verified — payment matched"**.
5. Check `mail_queue` got a row (and Brevo sent the mail, once § 3 is wired).
6. Restore the real fee. Delete the test row in Table Editor → `registrations`.

## 7 · Fallbacks & ops notes

- Delegate submits a wrong UTR? They can submit again while pending (the row
  just updates); or you fix it in the console via **Bind**.
- Bank sends no UTR in credit SMS? The amount path still auto-matches single
  pending registrations; the rest take one click in the console.
- Mode B routine: set a daily reminder during the registration window —
  ping your school contact, paste what they sent, done. An unmatched paste
  (odd format) is never lost: it sits in the feed for a manual **Bind**.
- Want zero risk on ambiguous amounts? Give each delegate a unique-amount
  invoice (₹1499 + paise suffix) — the amount path becomes deterministic.
- The dormant Cashfree files (`schema.sql` fee columns, `functions/`) can
  stay untouched — they only ever activate if KYC details ever arrive.
