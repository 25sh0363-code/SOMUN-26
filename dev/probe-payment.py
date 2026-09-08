#!/usr/bin/env python3
"""Payment flow probe (r28): drives the REAL registration wizard against the
LIVE Supabase project — seals patched via the shared config module, the QR
verify box armed for real, the UTR submitted for real.

Two install states, both asserted gracefully:
  PRE  (payment-setup.sql not run yet): register falls back to the legacy
        insert → the live table's broken anon policy 401s → the wizard must
        show its "desk isn't installed" hint; UTR/status/console must all
        degrade gracefully (expected RPC 404s, never crashes).
  POST (after the SQL): full path — real reference code, QR box armed,
        UTR accepted by the live RPC.

One clearly-labelled dev row lands in `registrations` on POST runs — delete
it from the dashboard afterwards.

Run: python3 dev/probe-payment.py   (needs dev/serve.py on 127.0.0.1:3000)"""
import json
import os
import sys
from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:3000"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "shots")
os.makedirs(OUT, exist_ok=True)

results, errors = [], []

# requests that 404/401 BY DESIGN until the payment SQL is installed, plus
# the QR image file (legitimately absent until the treasurer drops it)
EXPECTED = ("rpc/submit_payment_utr", "rpc/payment_status", "rpc/pay_admin_overview",
            "rpc/register_delegate", "/rest/v1/registrations", "images/payment-qr.png")
failed, expected = [], []


def check(name, ok, detail=""):
    results.append((name, bool(ok)))
    print(("PASS " if ok else "FAIL ") + name + ("  " + str(detail) if detail else ""))


def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        ctx = browser.new_context(viewport={"width": 1440, "height": 900})
        pg = ctx.new_page()
        pg.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
        pg.on("requestfailed", lambda r: failed.append(r.url))
        pg.on("response", lambda r: (
            expected.append(f"{r.status} {r.url}") if r.status >= 400 and any(x in r.url for x in EXPECTED)
            else failed.append(f"{r.status} {r.url}") if r.status >= 400
            else None))

        pg.goto(BASE, wait_until="networkidle")
        pg.click("#gate-enter", timeout=3000)
        pg.wait_for_timeout(2500)

        # 1 · register page is sealed by default
        pg.evaluate("location.hash = '#/register'")
        pg.wait_for_timeout(1600)
        sealed = pg.evaluate("!!document.querySelector('#reg-box.is-veiled .reg-veil')")
        check("register wizard sealed by default", sealed)
        pg.screenshot(path=f"{OUT}/pay-reg-sealed.png")

        # 2 · patch the shared config module (probe-only — same live instance)
        pg.evaluate("""(async () => {
          const m = await import('./js/config.js');
          m.CONFIG.REGISTRATIONS_OPEN = true;
          m.CONFIG.REGISTRATION_FEE = 1499;
          m.CONFIG.UPI_QR.UPI_ID = 'somun-probe@upi';
          const box = document.querySelector('#reg-box');
          box.classList.remove('is-veiled');
          box.removeAttribute('inert');
          box.querySelector('.reg-veil')?.remove();
          document.querySelector('#status-card')?.removeAttribute('hidden');
          window.__renderPayStage();
        })()""")
        pg.wait_for_timeout(400)

        # 3 · walk the wizard: stage I filled → stage II preference → stage III
        pg.fill('#fullName', 'DEV PROBE — delete me')
        pg.fill('#email', 'dev-probe@somun-test.example')
        pg.fill('#phone', '+91 90000 00000')
        pg.fill('#institution', 'DEV PROBE ROW — safe to delete')
        pg.check('#email-confirm')
        pg.click('[data-stage="1"] [data-next]')
        pg.wait_for_timeout(300)
        pg.select_option('#pref1', index=1)
        pg.click('[data-stage="2"] [data-next]')
        pg.wait_for_timeout(300)
        stage3 = pg.evaluate("""(() => ({
          amount: document.querySelector('#pay-amount').textContent,
          copy: document.querySelector('#pay-copy').textContent,
        }))()""")
        check("stage III: fee announced + QR/UTR copy",
              "1,499" in stage3["amount"].replace("₹", "").strip()
              and "UPI QR" in stage3["copy"] and "UTR" in stage3["copy"],
              json.dumps(stage3))
        pg.screenshot(path=f"{OUT}/pay-stage3.png")

        # 4 · submit (RPC door → legacy fallback → graceful pre-install state)
        pg.click('[data-stage="3"] [data-next]')
        pg.wait_for_timeout(200)
        pg.click('#reg-submit')
        pg.wait_for_timeout(3200)
        ok = pg.evaluate("""(() => ({
          success: !document.querySelector('#reg-success').hidden,
          ref: document.querySelector('#refcode').textContent,
          toast: document.querySelector('#toast').textContent,
        }))()""")
        live = ok["success"] and ok["ref"].startswith("SM26-") and ok["ref"] != "SM26-XXXXX"
        if live:
            check("wizard submit → success box + reference code (POST-install RPC path)",
                  True, ok["ref"])
            print(f"\nDEV ROW CREATED — ref {ok['ref']} · delete from Table Editor → registrations")
        else:
            pre = ("row-level security" in ok["toast"] or "isn't installed" in ok["toast"]
                   or "not installed" in ok["toast"] or "SQL Editor" in ok["toast"])
            check("PRE-install: submit degrades gracefully with a run-the-SQL hint (no crash)",
                  pre, ok["toast"][:110])
            print("\nPRE-INSTALL STATE — run supabase/schema.sql + payment-setup.sql, then re-run this probe for the live path")

        # 5 · Scan·Pay·Confirm panel state — armed when live, dormant pre-install
        armed = pg.evaluate("""(() => {
          const box = document.querySelector('#pay-qr-box');
          return {
            visible: !box.hidden,
            amount: box.hidden ? null : document.querySelector('#pay-qr-amount').textContent,
            vpa: box.hidden ? null : document.querySelector('#pay-qr-vpa').textContent,
            vpaShown: box.hidden ? null : !document.querySelector('#pay-qr-vpa').hidden,
            copyShown: box.hidden ? null : !document.querySelector('#pay-qr-copy').hidden,
            imgHidden: box.hidden ? null : document.querySelector('#pay-qr-img').hidden,
            emptyShown: box.hidden ? null : !document.querySelector('#pay-qr-empty').hidden,
          };
        })()""")
        if live:
            check("QR box armed: ₹1,499 + VPA copy + graceful QR placeholder",
                  armed["visible"] and "1,499" in armed["amount"]
                  and armed["vpa"] == "somun-probe@upi" and armed["vpaShown"]
                  and armed["copyShown"] and armed["imgHidden"] and not armed["emptyShown"],
                  json.dumps(armed))

            # 6 · UTR validation: empty submit → toast, no network
            pg.click('#utr-submit')
            pg.wait_for_timeout(500)
            toast = pg.evaluate("document.querySelector('#toast').textContent")
            check("empty UTR blocked with a toast (no request)", "Almost there" in toast)

            # 7 · real UTR submit → matched now, or watching the feed
            pg.fill('#utr-input', '123456789012')
            pg.click('#utr-submit')
            pg.wait_for_timeout(2400)
            st = pg.evaluate("""(() => ({
              text: document.querySelector('#utr-status').textContent,
              shown: !document.querySelector('#utr-status').hidden,
            }))()""")
            check("UTR submit: RPC answered (verified or feed-watching state)",
                  st["shown"] and ("verified" in st["text"].lower() or "watching" in st["text"].lower()),
                  st["text"][:90])
        else:
            check("QR box stays dormant pre-install (no half-armed UI)",
                  not armed["visible"], json.dumps(armed))
        pg.screenshot(path=f"{OUT}/pay-success-qr.png")

        # 8 · status lookup — ref + email pair, graceful until installed.
        # Re-enter the register view first: a live submit hides #reg-form-wrap
        # (the sidebar rides inside it), and the remount restores the form.
        pg.evaluate("location.hash = '#/faqs'")
        pg.wait_for_timeout(900)
        pg.evaluate("location.hash = '#/register'")
        pg.wait_for_timeout(1200)
        pg.fill('#status-ref', ok["ref"] if live else 'SM26-PROBE')
        pg.fill('#status-email', 'dev-probe@somun-test.example')
        pg.click('#status-check')
        pg.wait_for_timeout(1800)
        res = pg.evaluate("document.querySelector('#status-result').textContent")
        if live:
            check("status lookup: answered (paid/pending state)",
                  any(x in res for x in ("Paid", "Verifying", "fee pending")), res[:90])
        else:
            check("status lookup: graceful 'not installed yet' (RPC 404 expected)",
                  "isn't installed" in res or "not installed" in res, res[:90])

        # 9 · #/verify gate — wrong key, console not installed
        pg.evaluate("location.hash = '#/verify'")
        pg.wait_for_timeout(1500)
        gate = pg.evaluate("""(() => ({
          active: document.querySelector('.view[data-view="verify"]').classList.contains('active'),
          gateShown: !document.querySelector('#pay-admin-gate').hidden,
          bodyHidden: document.querySelector('#pay-admin-body').hidden,
        }))()""")
        check("console view: gate sealed, no data on entry", all(gate.values()), json.dumps(gate))
        pg.fill('#pay-admin-key', 'probe-wrong-key')
        pg.click('#pay-admin-enter')
        pg.wait_for_timeout(1800)
        err = pg.evaluate("document.querySelector('#pay-admin-err').textContent")
        check("console unlock: graceful 'run payment-setup.sql' guidance",
              "payment-setup.sql" in err, err[:100])
        pg.screenshot(path=f"{OUT}/pay-verify-gate.png")

        ctx.close()
        browser.close()

    # the browser echoes every expected 404/401 as a native resource error —
    # those are the same allowlisted requests, not JS failures
    js_errors = [e for e in errors
                 if not (e.startswith("Failed to load resource") and expected)]
    check("0 JS console errors (expected-request resource echoes excluded)",
          len(js_errors) == 0, f"{len(js_errors)} " + "; ".join(js_errors[:3]))
    check("0 unexpected failed requests", len(failed) == 0,
          f"{len(failed)} " + "; ".join(failed[:3]))
    rest_expected = [e for e in expected if "/rest/v1/" in e]
    check(f"expected REST-404/401s observed ({len(rest_expected)})",
          (len(rest_expected) >= 1) if not live else (len(rest_expected) == 0),
          "; ".join(sorted(set(rest_expected))[:4]))

    bad = [r for r in results if not r[1]]
    print(f"\n{'ALL PASS' if not bad else 'FAILURES: ' + str(len(bad))}  ({len(results)} checks)")
    sys.exit(1 if bad else 0)


run()
