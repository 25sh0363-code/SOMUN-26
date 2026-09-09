# SOMUN '26 — Automated confirmation mails (your Gmail, free)

When a payment verifies, the delegate gets a confirmation mail **sent from
your own Gmail**. No mail service, no domain, no cost. Chain:

```
payment verified → mail_queue INSERT → SQL trigger (mailer-hook.sql)
  → POST to your Apps Script web app → MailApp sends from your Gmail
  → script marks the queue row sent → console counter stays truthful
```

Gmail consumer quota: ~100 mails/day — plenty at school-MUN volume; beyond
that the script errors for that day and mails can be requeued tomorrow.

## One-time setup (~15 min)

### 1 · Create the script (your Google account)
1. Go to **script.google.com** → **New project** (name it `somun-mailer`).
2. Delete the stub, paste the whole of `supabase/apps-script/Code.gs`.
3. At the top of the code, set `MAILER_SECRET` to any random string
   (e.g. reuse the generator trick: a 20-char gibberish string).
   **Keep it — the same string goes into Supabase in step 3.**
4. *Optional but recommended* — lets the script mark mails as sent so the
   console's "Mails queued" counter drops:
   Project Settings ⚙ → **Script properties** → add:
   - `SUPABASE_URL` = `https://gvhlbnyxysfhfwrflxsg.supabase.co`
   - `SUPABASE_SERVICE_KEY` = dashboard → Settings → API → `service_role`
     (secret — paste it only here, never into the site code)

### 2 · Deploy as a web app
1. **Deploy → New deployment → select type: Web app**
2. Execute as: **Me** · Who has access: **Anyone**
3. **Deploy** → copy the **Web app URL** (`…/exec`).
4. Sanity ping: open that URL in a browser tab → you should see
   `SOMUN '26 mailer is alive.`
   (First auth prompt, if any: Advanced → Go to … — normal for own scripts.)

### 3 · Wire Supabase to it
1. **Table Editor → `app_secrets`** → edit:
   - `mailer_url` → the `…/exec` URL from step 2
   - `mailer_secret` → the same string from step 1.3
2. **SQL Editor** → paste the whole of `supabase/mailer-hook.sql` → **Run**.
   (Idempotent — re-running upgrades in place; it never overwrites a real
   URL/secret.)

## Test it (₹1 mode is perfect for this)

1. Register yourself on the site → pay the ₹1.xx invoice via the app →
   submit UTR + screenshot.
2. Console `#/verify` → click **Verify** on the row.
3. Within ~a minute the confirmation mail lands in your inbox —
   from your Gmail, with the ref code and amount.
4. Console: "Mails queued" drops back to 0 (if you set the script
   properties); `mail_queue` row shows `sent_at`.

Direct script test without any payment (paste in a terminal, with your
URL/secret):

```
curl -s -X POST "PASTE-EXEC-URL-HERE" \
  -H "Content-Type: application/json" \
  -d '{"secret":"PASTE-SECRET-HERE","template":"payment_verified","mail_id":0,
       "to":"YOU@gmail.com","name":"Test Delegate","ref_code":"TEST-01",
       "amount":"1.63","tier":"early","institution":"Test School"}'
```

## Notes & gotchas

- **Requeue button**: fires a new mail only when no waiting row exists for
  that registration. If a stale waiting row blocks it, delete that row in
  Table Editor → `mail_queue`, then click **Requeue** — the fresh INSERT
  re-triggers the hook.
- The trigger is silent while `mailer_url` is empty/placeholder — mails
  keep queueing in the console exactly as before, nothing breaks.
- Spam tip: send one test to yourself first; if Gmail files it under
  Promotions, that's normal — the delegate still receives it.
- **Before registrations open**: set `fee_base_early` back to `2799` in
  `app_secrets` (₹1 is a test-only price).
