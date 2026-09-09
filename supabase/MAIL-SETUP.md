# SOMUN '26 — Automated confirmation mails (your Gmail, free)

When a payment verifies, the delegate gets a confirmation mail **sent from
your own Gmail**. No mail service, no domain, no cost. Chain:

```
payment verified (or a rejection reason saved) → mail_queue row
  → SQL trigger (mailer-hook.sql) fires on INSERT and on Requeue
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
5. **Updating the script later** (e.g. to add the rejection template):
   paste the new Code.gs → **Deploy → Manage deployments → ✏ → Version:
   New version → Deploy**. The `…/exec` URL stays the same. If you skip
   this, rejection notices are skipped as "unknown template".

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
4. Console: "Emails waiting" drops back to 0 (if you set the script
   properties); `mail_queue` row shows `sent_at`.
5. **Rejection mail**: click **Reject** on a row, type the reason — the
   delegate gets the action-needed mail with that exact line and the
   somunpr@gmail.com contact. (Requires the Code.gs with the rejection
   template, deployed as a NEW version per step 2.5.)

Direct script test without any payment (paste in a terminal, with your
URL/secret):

```
curl -s -X POST "PASTE-EXEC-URL-HERE" \
  -H "Content-Type: application/json" \
  -d '{"secret":"PASTE-SECRET-HERE","template":"payment_verified","mail_id":0,
       "to":"YOU@gmail.com","name":"Test Delegate","ref_code":"TEST-01",
       "amount":"1.63","tier":"early","institution":"Test School"}'
```

## Why is a mail still waiting? (the outbox tells you)

The console's Confirmation emails card prints the state of every mail:

- **`sent <time>`** — delivered by Apps Script (needs the script
  properties from step 1.4; without them mails go out but stay unstamped).
- **`hook not configured …`** — `mailer_url` is still empty/placeholder in
  `app_secrets`. Finish step 3, then hit **Requeue** on the mail.
- **`handed to the mailer · attempt N`** — Supabase fired it at Apps
  Script but never heard back. If it stays like that for a minute:
  1. open the `…/exec` URL in a tab — it must say `mailer is alive`;
  2. check the delivery result in **SQL Editor**:
     ```sql
     select id, status_code, left(content, 200) as reply
       from net._http_response order by id desc limit 5;
     ```
     `rejected: bad secret` → mailer_secret doesn't match Code.gs;
     `error: …` → read the message; no rows → pg_net never fired, re-run
     mailer-hook.sql.
- **Requeue** re-fires the latest mail for that delegate whether it was
  sent, stuck or waiting — no Table Editor surgery needed anymore.

## Notes & gotchas

- Spam tip: send one test to yourself first; if Gmail files it under
  Promotions, that's normal — the delegate still receives it.
- **Before registrations open**: set `fee_base_early` back to `2799` in
  `app_secrets` (₹1 is a test-only price).
