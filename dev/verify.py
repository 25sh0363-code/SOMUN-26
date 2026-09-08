#!/usr/bin/env python3
"""Full regression suite (rebuilt in tracked dev/ after the r27 reset wiped
gitignored scripts/): config seals, countdown spotlight (anti-churn + hidden
cursor), resources cards, deck veil, mobile seals, console/network hygiene.
Run: python3 dev/verify.py   (needs dev/serve.py on 127.0.0.1:3000)"""
import json
import os
import sys
from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:3000"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "shots")
os.makedirs(OUT, exist_ok=True)

results, errors, failed = [], [], []


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
        pg.on("response", lambda r: failed.append(f"{r.status} {r.url}") if r.status >= 400 else None)
        pg.goto(BASE, wait_until="networkidle")
        pg.click("#gate-enter", timeout=3000)
        pg.wait_for_timeout(3000)

        # 1 · home four-card committees preview sealed
        pg.evaluate("document.querySelector('#preview-grid').scrollIntoView({block:'center'})")
        pg.wait_for_timeout(1400)
        prev = pg.evaluate("""(() => {
          const g = document.querySelector('#preview-grid');
          return {
            sealed: g.classList.contains('is-sealed'),
            inert: g.hasAttribute('inert'),
            veil: !!g.querySelector('.preview-veil'),
            blur: [...g.querySelectorAll('.preview-grid.is-sealed > *:not(.reg-veil), .preview-card')]
              .some(el => getComputedStyle(el).filter.includes('blur')),
          };
        })()""")
        check("preview grid sealed + veiled + inert", all(prev.values()), json.dumps(prev))
        pg.screenshot(path=f"{OUT}/d-preview-sealed.png")

        # 2 · home venue strip redacted
        pg.evaluate("document.querySelector('.hmx-venue-title').scrollIntoView({block:'center'})")
        pg.wait_for_timeout(1200)
        strip = pg.evaluate("""(() => {
          const el = document.querySelector('.hmx-venue-title .venue-redact');
          return {
            blur: el ? getComputedStyle(el).filter : 'missing',
            pe: el ? getComputedStyle(el).pointerEvents : 'missing',
            site: document.querySelector('#site').className,
          };
        })()""")
        check("home venue strip redacted",
              "blur" in strip["blur"] and strip["pe"] == "none"
              and "venue-sealed" in strip["site"], json.dumps(strip))
        pg.screenshot(path=f"{OUT}/d-venue-strip.png")

        # 3 · countdown focus mode (apple spotlight: page blurs, timer pops)
        pg.evaluate("window.scrollTo(0, 0)")
        pg.wait_for_timeout(1600)
        pg.screenshot(path=f"{OUT}/d-countdown-idle.png")
        box = pg.locator("#countdown").bounding_box()
        pg.mouse.move(box["x"] + box["width"] / 2, box["y"] + box["height"] / 2, steps=8)
        pg.wait_for_timeout(900)
        focus = pg.evaluate("""(() => {
          const veil = document.querySelector('.cd-veil');
          const ghost = document.querySelector('.cd-ghost');
          return {
            veilOn: !!veil && veil.classList.contains('is-on'),
            veilBlur: veil ? getComputedStyle(veil).backdropFilter : 'none',
            ghostOn: !!ghost && ghost.classList.contains('is-on'),
            ghostTf: ghost ? getComputedStyle(ghost).transform : 'none',
            ghostCursor: ghost ? getComputedStyle(ghost).cursor : 'missing',
            origHidden: getComputedStyle(document.querySelector('#countdown')).visibility,
            ghostNum: ghost ? ghost.querySelector('.countdown-num').textContent : '',
            origNum: document.querySelector('#countdown .countdown-num').textContent,
          };
        })()""")
        check("countdown focus: veil blurs page, ghost pops 2x",
              focus["veilOn"] and "blur" in focus["veilBlur"] and focus["ghostOn"]
              and "2" in focus["ghostTf"].split(",")[0] and focus["origHidden"] == "hidden",
              json.dumps(focus))
        check("spotlight hides the cursor while zoomed",
              focus["ghostCursor"] == "none", f"cursor={focus['ghostCursor']}")
        check("ghost numbers ticking (synced with real readout)",
              focus["ghostNum"] == focus["origNum"] and focus["ghostNum"] not in ("", "——"),
              f"ghost={focus['ghostNum']} orig={focus['origNum']}")
        pg.screenshot(path=f"{OUT}/d-countdown-focus.png")

        # 4 · settle back on leave
        pg.mouse.move(200, 300)  # leave the soft ring
        pg.wait_for_timeout(900)
        back = pg.evaluate("""(() => ({
          ghostGone: !document.querySelector('.cd-ghost'),
          veilGone: !document.querySelector('.cd-veil'),
          origBack: getComputedStyle(document.querySelector('#countdown')).visibility,
        }))()""")
        check("countdown settles back on leave", all(back.values()), json.dumps(back))

        # 5 · anti-churn: parked hover must hold focus (1 spawn, no toggle)
        pg.evaluate("""(() => {
          window.__spawns = 0;
          new MutationObserver((ms) => { for (const m of ms) for (const n of m.addedNodes)
            if (n.nodeType === 1 && n.classList.contains('cd-ghost')) window.__spawns++;
          }).observe(document.body, { childList: true });
        })()""")
        box2 = pg.locator("#countdown").bounding_box()
        pg.mouse.move(box2["x"] + box2["width"] / 2, box2["y"] + box2["height"] * 0.85, steps=6)
        pg.wait_for_timeout(1600)
        parked = pg.evaluate("({spawns: window.__spawns, alive: !!document.querySelector('.cd-ghost.is-on')})")
        check("anti-churn: parked hover holds focus (1 spawn, no toggle)",
              parked["spawns"] == 1 and parked["alive"], json.dumps(parked))
        pg.mouse.move(200, 300)
        pg.wait_for_timeout(900)

        # 6 · about — sealed map exhibit
        pg.evaluate("location.hash = '#/about'")
        pg.wait_for_timeout(1800)
        pg.evaluate("document.querySelector('#ab-map').scrollIntoView({block:'center'})")
        pg.wait_for_timeout(1600)
        mp = pg.evaluate("""(() => {
          const map = document.querySelector('#ab-map');
          const frame = map.querySelector('.ab-map-frame');
          const sealedV = map.querySelector('.ab-map-sealed');
          const coords = map.querySelector('.ab-map-coords');
          const link = map.querySelector('.ab-map-link');
          const h2 = document.querySelector('.ab-h2 .venue-redact');
          return {
            frameSrc: frame ? frame.getAttribute('src') : 'missing',
            sealedShown: sealedV ? getComputedStyle(sealedV).display : 'missing',
            topHidden: map.querySelector('.ab-map-top') ? getComputedStyle(map.querySelector('.ab-map-top')).visibility : 'missing',
            coordsBlur: coords ? getComputedStyle(coords).filter.includes('blur') : false,
            linkInert: link ? getComputedStyle(link).pointerEvents : 'missing',
            h2Blur: h2 ? getComputedStyle(h2).filter.includes('blur') : false,
          };
        })()""")
        check("map sealed: no embed request + stamp + strips quiet",
              mp["frameSrc"] is None and mp["sealedShown"] == "flex" and mp["topHidden"] == "hidden",
              json.dumps(mp))
        check("map redactions: coords/addr/link/h2 blurred",
              mp["coordsBlur"] and mp["linkInert"] == "none" and mp["h2Blur"], json.dumps(mp))
        pg.screenshot(path=f"{OUT}/d-map-sealed.png")

        # 7 · origin + timeline mentions
        origin_ok = pg.evaluate("""(() => {
          const els = [...document.querySelectorAll('.ab-origin-p .venue-redact, .ab-tl-desc .venue-redact')];
          return els.length >= 2 && els.every(el => getComputedStyle(el).filter.includes('blur'));
        })()""")
        check("dossier + timeline mentions redacted", origin_ok)

        # 8 · footer mentions
        pg.evaluate("document.querySelector('.footer').scrollIntoView({block:'end'})")
        pg.wait_for_timeout(1200)
        foot = pg.evaluate("""(() => {
          const els = [...document.querySelectorAll('.footer .venue-redact')];
          return els.length === 2 && els.every(el => getComputedStyle(el).filter.includes('blur'));
        })()""")
        check("footer mentions redacted", foot)
        pg.screenshot(path=f"{OUT}/d-footer.png")

        # 9 · itinerary intro
        pg.evaluate("location.hash = '#/itinerary'")
        pg.wait_for_timeout(1500)
        itin = pg.evaluate("""(() => {
          const el = document.querySelector('#itin-intro .venue-redact');
          return el ? getComputedStyle(el).filter.includes('blur') : 'missing';
        })()""")
        check("itinerary intro venue redacted", itin is True, str(itin))
        pg.screenshot(path=f"{OUT}/d-itinerary.png")

        # 10 · resources — three archive cards must be revealed (r26 fix)
        pg.evaluate("location.hash = '#/resources'")
        pg.wait_for_timeout(1500)
        pg.evaluate("document.querySelector('#res-grid').scrollIntoView({block:'center'})")
        pg.wait_for_timeout(1800)
        rescards = pg.evaluate("""(() => {
          const wraps = [...document.querySelectorAll('#res-grid .reveal')];
          return {
            cards: document.querySelectorAll('#res-grid .res-card').length,
            inview: wraps.filter(w => w.classList.contains('in-view')).length,
            minOpacity: Math.min(...wraps.map(w => parseFloat(getComputedStyle(w).opacity))),
          };
        })()""")
        check("resources: 3 archive cards revealed (no orphaned reveals)",
              rescards["cards"] == 3 and rescards["inview"] == 3
              and rescards["minOpacity"] > 0.95, json.dumps(rescards))
        pg.screenshot(path=f"{OUT}/d-resources.png")

        # 11 · committees deck still veiled (regression)
        pg.evaluate("location.hash = '#/committees'")
        pg.wait_for_timeout(1500)
        deck = pg.evaluate("!!document.querySelector('#deck.is-veiled .reg-veil')")
        check("committees deck veil intact (regression)", deck)
        ctx.close()

        # ————————————— MOBILE —————————————
        ctx2 = browser.new_context(viewport={"width": 390, "height": 844})
        pm = ctx2.new_page()
        pm.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
        pm.on("requestfailed", lambda r: failed.append(r.url))
        pm.on("response", lambda r: failed.append(f"{r.status} {r.url}") if r.status >= 400 else None)
        pm.goto(BASE, wait_until="networkidle")
        pm.click("#gate-enter", timeout=3000)
        pm.wait_for_timeout(3000)
        pm.evaluate("document.querySelector('#preview-grid').scrollIntoView({block:'center'})")
        pm.wait_for_timeout(1400)
        m_sealed = pm.evaluate("""(() => {
          const g = document.querySelector('#preview-grid');
          return { sealed: g.classList.contains('is-sealed'), veil: !!g.querySelector('.preview-veil') };
        })()""")
        check("mobile preview sealed", all(m_sealed.values()), json.dumps(m_sealed))
        pm.screenshot(path=f"{OUT}/m-preview-sealed.png")
        pm.evaluate("document.querySelector('.hmx-venue').scrollIntoView({block:'center'})")
        pm.wait_for_timeout(1200)
        pm.screenshot(path=f"{OUT}/m-venue-strip.png")
        pm.evaluate("location.hash = '#/about'")
        pm.wait_for_timeout(1800)
        pm.evaluate("document.querySelector('#ab-map').scrollIntoView({block:'center'})")
        pm.wait_for_timeout(1600)
        m_map = pm.evaluate("""(() => {
          const map = document.querySelector('#ab-map');
          return {
            frameSrc: map.querySelector('.ab-map-frame').getAttribute('src'),
            sealedShown: getComputedStyle(map.querySelector('.ab-map-sealed')).display,
          };
        })()""")
        check("mobile map sealed, embed never fetched",
              m_map["frameSrc"] is None and m_map["sealedShown"] == "flex", json.dumps(m_map))
        pm.screenshot(path=f"{OUT}/m-map-sealed.png")
        ctx2.close()
        browser.close()

    check("0 console errors", len(errors) == 0, f"{len(errors)} " + "; ".join(errors[:3]))
    check("0 failed requests", len(failed) == 0, f"{len(failed)} " + "; ".join(failed[:3]))

    bad = [r for r in results if not r[1]]
    print(f"\n{'ALL PASS' if not bad else 'FAILURES: ' + str(len(bad))}  ({len(results)} checks)")
    sys.exit(1 if bad else 0)


run()
