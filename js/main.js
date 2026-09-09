/* ————————————————————————————————————————————————————————————————
   SOMUN '26 — SITE BEHAVIOUR
   Vanilla JS. No frameworks, no build step.
   Sections: helpers · content render · router · gate · countdown ·
   reveal-on-scroll · committees deck · register form (Supabase) ·
   resources (Supabase) · itinerary
   ———————————————————————————————————————————————————————— */

import { CONFERENCE, COMMITTEES, FEES, ITINERARY, SHOW_ITINERARY, FAQS, ALLOCATION_MATRIX } from "./data.js";
import { CONFIG, supabaseConfigured, cashfreeEnabled, feeAnnounced, qrPayEnabled, payFlow, formatINR } from "./config.js";
import { icon, hydrateIcons } from "./icons.js";
import { makeConfetti } from "./confetti.js";

/* The registrations page presents Group Delegation in International
   Press's slot — same position in the preference selects and the
   allocation matrix, different participation mode. The committees page
   keeps its own full chamber list straight from data.js. */
const REG_OPTIONS = COMMITTEES.map((c) => c.slug === "ip"
  ? { slug: "gd", acronym: "GD", name: "Group Delegation" }
  : c);

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const pad2 = (n) => String(n).padStart(2, "0");
const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

/* stagger delays for the dossier entrance choreography (0.08 + i·0.085s) */
const stag = (i) => `transition-delay:${(0.08 + i * 0.085).toFixed(3)}s`;

/* escape anything data-driven before it meets innerHTML (console rows,
   status lines — registrations are visitor input, never trust them) */
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/* ————————————————— Supabase REST helper ————————————————— */

async function sb(path, opts = {}) {
  const res = await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: {
      apikey: CONFIG.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${CONFIG.SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      ...(opts.headers || {}),
    },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || `Supabase request failed (${res.status})`);
  }
  return res.json();
}

/* ————————————————— Toast ————————————————— */

let toastTimer;
function showToast(html, isErr = false) {
  const t = $("#toast");
  t.innerHTML = html;
  t.classList.toggle("err", isErr);
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 5200);
}

/* ————————————————— Static copy fill ————————————————— */

$('[data-copy="tagline"]') && ($('[data-copy="tagline"]').textContent = CONFERENCE.tagline);
$('[data-copy="dates"]') && ($('[data-copy="dates"]').textContent = CONFERENCE.dates);
$('[data-copy="venue"]') && ($('[data-copy="venue"]').textContent = `${CONFERENCE.venue} · ${CONFERENCE.city}`);
$("#itin-intro").innerHTML =
  `From the first roll call to the final gavel — the full three-day programme at <span class="venue-redact">${CONFERENCE.venue}</span> will be published right here, day by day.`;
$("#reg-intro").textContent =
  `Complete the four short stages below — information, experience and preferences, payment and extra notes — and the secretariat will respond with your portfolio allotment. For assistance write to ${CONFERENCE.email}.`;
$("#year").textContent = new Date().getFullYear();

/* ————————————————— Ticker ————————————————— */

{
  const words = ["SOMUN MMXXVI", "BORN IN HYDERABAD", "TWELVE CHAMBERS", "THREE DAYS", "WORDS, NOT WAR"];
  const row = words.map(
    (w) => `<span class="ticker-word">${w}</span><span class="ticker-diamond"></span>`
  ).join("");
  $$("[data-ticker]").forEach((el) => (el.innerHTML = row + row));
}

/* ————————————————— Hero scene — monolith · dust · roll call · parallax —
   Hybrid build: graded gavel frame (CSS) + live layers (here):
     1  SOMUN wordmark split into a 3D letter cascade
     2  split-flap board cycling the XII chambers ("Roll Call")
     3  dust motes drifting through the gavel light (canvas, no glow)
     4  pointer parallax across scene frame · dust · watermark
   One rAF loop drives 3+4; both pause while the hero is off-screen. ————— */

{
  const hero = $("#hero");
  if (hero) {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    let heroVisible = true;

    /* —— 1 · wordmark cascade —— */
    const line1 = $(".hero-title-line.anim--t1", hero);
    const title = $(".hero-title", hero);
    if (line1 && title && !line1.dataset.split) {
      line1.dataset.split = "1";
      title.classList.add("hero-title--live");
      const word = line1.textContent.trim();
      line1.setAttribute("aria-label", word);
      line1.innerHTML = [...word]
        .map((ch, i) => `<span class="ht-l" style="--i:${i}" aria-hidden="true">${ch}</span>`)
        .join("");
    }

    /* —— 2 · split-flap roll call ——
       Each word is CENTRE-padded into the fixed tile row — a short
       acronym like "IP" keeps invisible blanks on both sides, so the
       visible letters always sit dead-centre under the kicker. While
       COMMITTEES_REVEALED is false the board flips behind a blur and
       a "chambers under seal" note sits beneath it. */
    const row = $("#rollcall-row");
    if (row) {
      const words = [
        "ROLL CALL",
        ...COMMITTEES.map((c) => c.acronym.toUpperCase()),
        `SOMUN \u201926`,
      ];
      const n = Math.max(...words.map((w) => w.length));
      const tiles = [];
      for (let i = 0; i < n; i++) {
        const t = document.createElement("span");
        t.className = "flap flap--blank";
        t.textContent = "\u00a0";
        row.append(t);
        tiles.push(t);
      }
      const setTile = (t, ch) => {
        if (ch === " ") {
          t.classList.add("flap--blank");
          t.textContent = "\u00a0";
        } else {
          t.classList.remove("flap--blank");
          t.textContent = ch;
        }
      };
      const centerPad = (word, width) => {
        const chars = [...word];
        const total = Math.max(0, width - chars.length);
        const left = Math.floor(total / 2);
        return [...Array(left).fill(" "), ...chars, ...Array(total - left).fill(" ")];
      };
      centerPad(words[0], n).forEach((ch, i) => setTile(tiles[i], ch));

      const flipTo = (word) => {
        centerPad(word, n).forEach((ch, i) => {
          const t = tiles[i];
          const cur = t.classList.contains("flap--blank") ? " " : t.textContent;
          if (cur === ch) return;
          const delay = i * 42 + Math.random() * 70; // mechanical stagger
          if (reduceMotion) {
            setTimeout(() => setTile(t, ch), delay);
            return;
          }
          setTimeout(() => {
            t.classList.remove("flap-in");
            t.classList.add("flap-out"); // leaf swings down…
            setTimeout(() => {
              setTile(t, ch);            // …character swaps at the seam…
              t.classList.remove("flap-out");
              t.classList.add("flap-in"); // …and settles back
              setTimeout(() => t.classList.remove("flap-in"), 110);
            }, 95);
          }, delay);
        });
      };

      let wi = 0;
      setInterval(() => {
        if (!heroVisible || document.hidden) return;
        wi = (wi + 1) % words.length;
        flipTo(words[wi]);
      }, 2700);

      /* committees still sealed → the board flips behind a blur */
      if (!CONFIG.COMMITTEES_REVEALED) {
        row.classList.add("flap-row--sealed");
        const note = document.createElement("p");
        note.className = "rollcall-seal-note";
        note.textContent = "Chambers under seal";
        row.parentElement.append(note);
      }
    }

    /* —— 3 + 4 · dust canvas & pointer parallax, one loop —— */
    const dust = $(".hero-dust", hero);
    const pars = $$(".par", hero);
    let ctx = null, W = 0, H = 0, parts = [];
    let tx = 0, ty = 0, cx = 0, cy = 0;

    const seedDust = () => {
      const count = Math.min(90, Math.round((W * H) / 26000));
      parts = Array.from({ length: count }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        r: 0.5 + Math.random() * 1.3,
        a: 0.05 + Math.random() * 0.2,
        vy: -(0.05 + Math.random() * 0.2), // motes rise through the light
        vx: (Math.random() - 0.5) * 0.12,
        ph: Math.random() * Math.PI * 2,   // twinkle phase
        sp: 0.4 + Math.random() * 0.9,
        red: Math.random() < 0.06,         // rare crimson mote
      }));
    };
    const resizeDust = () => {
      if (!dust) return;
      const DPR = Math.min(2, window.devicePixelRatio || 1);
      W = hero.clientWidth;
      H = hero.clientHeight;
      dust.width = W * DPR;
      dust.height = H * DPR;
      ctx = dust.getContext("2d");
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      seedDust();
    };
    resizeDust();
    /* hero is display:none while the gate plays — measure on first paint,
       not on module init (a window-resize listener alone misses that) */
    if (typeof ResizeObserver !== "undefined") {
      new ResizeObserver(() => resizeDust()).observe(hero);
    }
    window.addEventListener("resize", resizeDust);

    if (finePointer && !reduceMotion) {
      hero.addEventListener("pointermove", (e) => {
        const r = hero.getBoundingClientRect();
        tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
        ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
      });
      hero.addEventListener("pointerleave", () => { tx = 0; ty = 0; });
    }

    const frame = () => {
      if (heroVisible && !document.hidden) {
        if (ctx) {
          ctx.clearRect(0, 0, W, H);
          const t = performance.now() / 1000;
          for (const p of parts) {
            p.x += p.vx;
            p.y += p.vy;
            if (p.y < -4) { p.y = H + 4; p.x = Math.random() * W; }
            if (p.x < -4) p.x = W + 4;
            else if (p.x > W + 4) p.x = -4;
            const tw = 0.5 + 0.5 * Math.sin(t * p.sp * 2 + p.ph);
            ctx.globalAlpha = p.a * (0.35 + 0.65 * tw);
            ctx.fillStyle = p.red ? "rgba(200, 16, 46, 0.9)" : "rgba(238, 228, 206, 0.9)";
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.globalAlpha = 1;
        }
        if (finePointer) {
          cx += (tx - cx) * 0.055;
          cy += (ty - cy) * 0.055;
          for (const el of pars) {
            const d = parseFloat(el.dataset.depth || "0.5");
            el.style.transform = `translate3d(${(-cx * d * 14).toFixed(2)}px, ${(-cy * d * 10).toFixed(2)}px, 0)`;
          }
        }
      }
      requestAnimationFrame(frame);
    };
    new IntersectionObserver(
      (es) => { heroVisible = es[0].isIntersecting; },
      { threshold: 0 }
    ).observe(hero);
    if (!reduceMotion) requestAnimationFrame(frame);
  }
}

/* ————————————————— Secretariat wire — typewriter + click-to-copy ————— */

{
  const typeEl = $("#dispatch-address");
  const card = $("#dispatch-copy");
  const fm = $("#footer-mail");
  const addr = typeEl ? typeEl.dataset.address : "";
  let typed = false;

  const typeIt = () => {
    if (typed || !typeEl) return;
    typed = true;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      typeEl.textContent = addr;
      return;
    }
    let i = 0;
    (function step() {
      if (i <= addr.length) {
        typeEl.textContent = addr.slice(0, i++);
        setTimeout(step, 34 + Math.random() * 42);
      }
    })();
  };

  if (typeEl) {
    const io = new IntersectionObserver(
      (es) => { if (es[0].isIntersecting) { typeIt(); io.disconnect(); } },
      { threshold: 0.35 }
    );
    io.observe(typeEl);
  }

  const copyAddr = async (btn) => {
    try {
      await navigator.clipboard.writeText(addr);
      showToast(`<strong>Address copied</strong>${addr} is on your clipboard.`);
      if (btn) {
        btn.classList.add("is-copied");
        const tag = $(".dispatch-card-hint", btn);
        if (tag) {
          tag.innerHTML = `<i data-icon="badge-check" data-cls="dispatch-card-hint-ic"></i>Copied`;
          hydrateIcons(btn);
          setTimeout(() => {
            tag.innerHTML = `<i data-icon="copy" data-cls="dispatch-card-hint-ic"></i>Copy`;
            hydrateIcons(btn);
            btn.classList.remove("is-copied");
          }, 2400);
        }
      }
    } catch {
      showToast(`Couldn\u2019t reach the clipboard \u2014 long-press the address to copy it.`, true);
    }
  };

  if (card) card.addEventListener("click", () => copyAddr(card));
  if (fm) fm.addEventListener("click", () => copyAddr(null));
}

/* ————————————————— Pillars ————————————————— */

{
  const PILLARS = [
    { ic: "gavel", title: "Rigorous Debate", body: "Agendas chosen to bite — autonomous weapons, electoral reform, pandemic treaties. No soft topics, no free passes." },
    { ic: "globe", title: "Global Perspective", body: "Committees span six continents' worth of crises. Delegates argue positions they did not choose — and understand better for it." },
    { ic: "users", title: "Elite Boards", body: "Hand-picked executive boards that keep sessions fast, fair and fierce — with written feedback after every session." },
    { ic: "trophy", title: "Coveted Awards", body: "Best Delegate gavels, delegation trophies and IP laurels — decided transparently against published scoring rubrics." },
  ];
  $("#pillars").innerHTML = PILLARS.map((p, i) => `
    <div class="pillar-cell reveal" data-delay="${(i * 0.08).toFixed(2)}">
      <div class="pillar-box">
        <div class="pillar-top">
          <i data-icon="${p.ic}" data-cls="pillar-icon" data-sw="1.4"></i>
          <span class="pillar-num">${pad2(i + 1)}</span>
        </div>
        <h3 class="pillar-title">${p.title}</h3>
        <p class="pillar-body">${p.body}</p>
      </div>
    </div>`).join("");
}

/* ————————————————— Home committees preview (first four) ————————————————— */

{
  $("#preview-grid").innerHTML = COMMITTEES.slice(0, 4).map((c, i) => `
    <div class="reveal" data-delay="${(i * 0.07).toFixed(2)}">
      <button class="preview-card" data-committee="${c.slug}" aria-label="Explore ${c.acronym}">
        <span class="preview-ghost" aria-hidden="true">${String(i + 1).padStart(2, "0")}</span>
        <div class="preview-top">
          <span class="preview-acronym">${c.acronym}</span>
          <span class="preview-diff">${c.difficulty}</span>
        </div>
        <p class="preview-name">${c.name}</p>
        <p class="preview-desc">${c.description}</p>
        <p class="preview-foot">Nº ${String(i + 1).padStart(2, "0")} · ${c.agendas.length} agendas →</p>
      </button>
    </div>`).join("");

  /* committees still sealed → the home four-card preview rides under the
     same veil as the deck: blurred + inert under a "Coming Soon" stamp */
  if (!CONFIG.COMMITTEES_REVEALED) {
    const grid = $("#preview-grid");
    grid.classList.add("is-sealed");
    grid.setAttribute("inert", "");
    const pv = document.createElement("div");
    pv.className = "reg-veil committee-veil preview-veil";
    pv.innerHTML = `
      <span class="veil-kicker">The Twelve Chambers</span>
      <p class="veil-line">Committees convene <em>soon.</em></p>
      <span class="reg-veil-stamp">Coming Soon</span>`;
    grid.append(pv);
  }
}

/* ————————————————— Committees deck slides ————————————————— */

const track = $("#deck-track");
  track.innerHTML = COMMITTEES.map((c, i) => {
    const roman = ROMAN[i];
    const plateInner = c.photo
      ? `<img class="plate-art" src="${c.photo}" alt="${c.acronym} — ${c.name}" loading="${i <= 1 ? "eager" : "lazy"}" />
         <div class="plate-shade"></div>`
      : `<div class="plate-empty">
           <span class="plate-empty-num">${roman}</span>
           <span class="plate-empty-text">Chamber artwork — coming soon</span>
         </div>`;
    return `
    <article class="deck-slide" data-idx="${i}" aria-label="${c.acronym} — ${c.name}">
      <div class="watermark-wrap"><span class="watermark text-hollow">${c.acronym}</span></div>
      <div class="seam seam--left"></div>
      <div class="seam seam--right"></div>
      <div class="dossier-wrap">
        <div class="dossier">
          <div class="wax-seal stagger-item" style="${stag(0)}" aria-hidden="true">
            <div class="wax-disc"><span class="wax-ring-1"></span><span class="wax-ring-2"></span><span class="wax-num">${roman}</span></div>
          </div>
          <svg class="corner-frame corner--tl" viewBox="0 0 48 48" fill="none" aria-hidden="true"><path d="M2 46 V14 Q2 2 14 2 H46" stroke="currentColor" stroke-width="2"/><path d="M10 46 V20 Q10 10 20 10 H46" stroke="currentColor" stroke-width="0.75"/><rect x="15.5" y="15.5" width="6" height="6" transform="rotate(45 18.5 18.5)" fill="currentColor"/></svg>
          <svg class="corner-frame corner--tr" viewBox="0 0 48 48" fill="none" aria-hidden="true"><path d="M2 46 V14 Q2 2 14 2 H46" stroke="currentColor" stroke-width="2"/><path d="M10 46 V20 Q10 10 20 10 H46" stroke="currentColor" stroke-width="0.75"/><rect x="15.5" y="15.5" width="6" height="6" transform="rotate(45 18.5 18.5)" fill="currentColor"/></svg>
          <svg class="corner-frame corner--bl" viewBox="0 0 48 48" fill="none" aria-hidden="true"><path d="M2 46 V14 Q2 2 14 2 H46" stroke="currentColor" stroke-width="2"/><path d="M10 46 V20 Q10 10 20 10 H46" stroke="currentColor" stroke-width="0.75"/><rect x="15.5" y="15.5" width="6" height="6" transform="rotate(45 18.5 18.5)" fill="currentColor"/></svg>
          <svg class="corner-frame corner--br" viewBox="0 0 48 48" fill="none" aria-hidden="true"><path d="M2 46 V14 Q2 2 14 2 H46" stroke="currentColor" stroke-width="2"/><path d="M10 46 V20 Q10 10 20 10 H46" stroke="currentColor" stroke-width="0.75"/><rect x="15.5" y="15.5" width="6" height="6" transform="rotate(45 18.5 18.5)" fill="currentColor"/></svg>
          <div class="dossier-inner-frame" aria-hidden="true"></div>

          <div class="dossier-grid">
            <div class="plate">
              ${plateInner}
              <div class="plate-caption">
                <span class="plate-num">${pad2(i + 1)}</span>
              </div>
            </div>

            <div class="dossier-body">
              <div class="dossier-content">
                <div class="dossier-top stagger-item" style="${stag(1)}">
                  <span class="diff-chip diff-chip--${c.diffKey}">${c.difficulty}</span>
                </div>
                <h3 class="dossier-acronym stagger-item" style="${stag(2)}">${c.acronym}</h3>
                <p class="dossier-name stagger-item" style="${stag(3)}">${c.name}</p>
                <div class="fleuron-rule stagger-item" style="${stag(4)}" aria-hidden="true">
                  <span class="fleuron-rule-l"></span><span class="fleuron-rule-d"></span><span class="fleuron-rule-r"></span>
                </div>
                <p class="dossier-desc stagger-item" style="${stag(5)}">${c.description}</p>
                <div class="agendas stagger-item" style="${stag(6)}">
                  <p class="agendas-kicker">Before the house</p>
                  ${c.agendas.map((a) => `<p class="agenda"><span class="agenda-diamond"></span>${a}</p>`).join("")}
                </div>
                <div class="dossier-foot stagger-item" style="${stag(7)}">
                  <div class="dossier-foot-row">
                    <button class="take-seat" data-committee="${c.slug}" aria-label="${c.cta} — ${c.acronym}">
                      <span class="take-seat-fill"></span>
                      <span class="take-seat-label">${c.cta} <i data-icon="arrow-right"></i></span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </article>`;
  }).join("");

  /* numerals rail */
  $("#deck-numerals").innerHTML = COMMITTEES.map((c, i) =>
    `<button class="deck-num" data-goto="${i}" aria-label="Go to committee ${i + 1}">${ROMAN[i]}<span class="deck-num-diamond"></span></button>`
  ).join("");
  $("#deck-total").textContent = `/ ${String(COMMITTEES.length).padStart(2, "0")}`;

/* ————— Committees veiled: the deck renders in place, then gets the exact
   treatment of the register wizard box — blurred + inert under a centered
   "Coming Soon" seal. Flip CONFIG.COMMITTEES_REVEALED in config.js to
   release; deck, head copy, executive boards and the chamber note all
   restore untouched, nothing else to change. ————— */
if (!CONFIG.COMMITTEES_REVEALED) {
  const cView = $(".view[data-view='committees']");
  cView.classList.add("is-veiled");

  /* head copy speaks for the sealed season; the original HTML stands again
     on reveal day with zero edits */
  $(".section-head-title", cView).innerHTML = `The arena is <em class="accent">sealed.</em>`;
  $(".section-head-intro", cView).textContent = "Twelve chambers are being briefed behind closed doors — dossiers, daises and portfolios unlock with the first committees reveal. Watch this space.";

  /* executive boards + chamber note stay dark until the chambers are declared */
  $("#exec-strip").setAttribute("hidden", "");
  $("#chamber-note").setAttribute("hidden", "");

  const deckEl = $("#deck");
  deckEl.classList.add("is-veiled");
  deckEl.setAttribute("inert", "");
  const veil = document.createElement("div");
  veil.className = "reg-veil committee-veil";
  veil.innerHTML = `
    <span class="veil-kicker">The Twelve Chambers</span>
    <p class="veil-line">Committees convene <em>soon.</em></p>
    <span class="reg-veil-stamp">Coming Soon</span>
    <span class="reg-veil-sub">Dossiers, daises and portfolios unlock with the first committees reveal.</span>
    <span class="veil-ticks" aria-hidden="true">${"<i></i>".repeat(12)}</span>`;
  $(".deck-sticky", deckEl).append(veil);
}

/* ————— Venue veiled: the grounds stay classified until the venue drop.
   Every mention renders in place with a blur-redact pass (.venue-redact —
   home strip, dossier, timeline, itinerary intro, footer), and the live
   map exhibit never arms — the Google embed isn't even fetched, so nothing
   leaks: coordinates, address and deep-link sit under the "Coming Soon"
   seal in chapter VII. Flip CONFIG.VENUE_REVEALED in config.js and the
   blur lifts + the map arms itself, zero other edits. ————— */
if (!CONFIG.VENUE_REVEALED) {
  $("#site").classList.add("venue-sealed");
}


/* ————————————————— Committee detail page (#/committees/<slug>) ————————————————— */

function renderCommitteePage(slug) {
  const idx = COMMITTEES.findIndex((c) => c.slug === slug);
  if (idx === -1) return false;
  const c = COMMITTEES[idx];
  const roman = ROMAN[idx];
  const sub = c.tagline || c.name;
  const plateInner = c.photo
    ? `<img class="plate-art" src="${c.photo}" alt="${c.acronym} — ${c.name}" loading="eager" />
       <div class="plate-shade"></div>`
    : `<div class="plate-empty">
         <span class="plate-empty-num">${roman}</span>
         <span class="plate-empty-text">Chamber artwork — coming soon</span>
       </div>`;

  /* dossier sections — headings follow the secretariat's committee document */
  const secs = [
    { id: "overview", title: "Committee overview", rail: "Overview", body: c.overview.map((p) => `<p>${p}</p>`).join("") },
    { id: "about", title: "About the committee", rail: "The committee", body: `<p>${c.about}</p>` },
    { id: "willdo", title: "What delegates will do", rail: "What you'll do", body: `<p>${c.willDo}</p>` },
    { id: "why", title: `Why ${c.acronym}?`, rail: `Why ${c.acronym}?`, body: `<p>${c.why}</p>` },
    { id: "focus", title: c.focusLabel, rail: c.focusLabel,
      body: `<div class="cv-focus">${c.focus
        .map((f, fi) => `<span class="cv-chip reveal" data-delay="${(0.05 * fi).toFixed(2)}"><span class="cv-chip-diamond"></span>${f}</span>`)
        .join("")}</div>
        ${c.kicker ? `<p class="cv-kicker-line reveal" data-delay="0.25"><i data-icon="quote" data-cls="cv-quote-ic"></i>${c.kicker}</p>` : ""}` },
    { id: "agenda", title: "Before the house", rail: "Before the house",
      body: `<div class="agendas cv-agendas">${c.agendas
        .map((a, ai) => `<p class="agenda"><span class="agenda-diamond"></span><span class="agenda-roman">${ROMAN[ai]}.</span> ${a}</p>`)
        .join("")}</div>` },
  ];

  $("#committee-view").innerHTML = `
    <div class="page-wrap cv-wrap">
      <div class="cv-progress" aria-hidden="true"><span class="cv-progress-fill" id="cv-progress-fill"></span></div>
      <button class="crumb reveal" data-nav="committees" aria-label="Back to all committees">
        <i data-icon="chevron-left"></i> All committees
      </button>

      <header class="committee-head reveal" data-delay="0.05">
        <div class="committee-kicker-row">
          <p class="committee-kicker">Committee ${roman} · ${pad2(idx + 1)} of ${pad2(COMMITTEES.length)}</p>
          <span class="diff-chip diff-chip--${c.diffKey}">${c.difficulty}</span>
        </div>
        <h1 class="committee-acronym text-hollow">${c.acronym}</h1>
        <p class="committee-name">${sub}</p>
        <div class="fleuron-rule" aria-hidden="true">
          <span class="fleuron-rule-l"></span><span class="fleuron-rule-d"></span><span class="fleuron-rule-r"></span>
        </div>
      </header>

      <div class="committee-grid">
        <div class="committee-plate-col reveal" data-delay="0.1">
          <div class="plate committee-plate">
            ${plateInner}
            <div class="plate-caption">
              <p class="plate-credit">Official chamber dossier${c.photo ? "" : " · artwork to follow"}</p>
              <span class="plate-num">${pad2(idx + 1)}</span>
            </div>
          </div>
          <p class="committee-plate-note"><i data-icon="gavel"></i> Rule of procedure and dais assignments release with the background guides.</p>
          <div class="cv-facts reveal" data-delay="0.16">
            <div class="cv-fact"><span>Chamber</span><strong>${c.acronym}</strong></div>
            <div class="cv-fact"><span>Level</span><strong>${c.difficulty}</strong></div>
            <div class="cv-fact"><span>On the floor</span><strong>${c.itemsLabel.replace(/^2 /, "").replace(/^./, (ch) => ch.toUpperCase())}</strong></div>
          </div>
        </div>

        <div class="committee-body cv-body">
          <nav class="cv-rail reveal" data-delay="0.08" aria-label="Dossier sections">
            ${secs.map((s, si) => `<button class="cv-rail-link${si === 0 ? " on" : ""}" data-cv="${s.id}"><span class="cv-rail-num">${pad2(si + 1)}</span>${s.rail}</button>`).join("")}
          </nav>

          <div class="cv-content">
            ${secs.map((s, si) => `
            <section class="cv-sec reveal" id="cv-${s.id}" data-cv-sec>
              <div class="cv-sec-head">
                <span class="cv-sec-num">§${pad2(si + 1)}</span>
                <span class="cv-sec-rule"></span>
                <h2 class="cv-sec-title">${s.title}</h2>
              </div>
              <div class="cv-sec-body">${s.body}</div>
            </section>`).join("")}

            <div class="committee-cta reveal" data-delay="0.1">
              <button class="btn btn--crimson btn--arrow" data-nav="register">
                Take your seat <i data-icon="arrow-right"></i>
              </button>
              <button class="btn btn--outline" data-nav="committees">Browse all committees</button>
            </div>
          </div>
        </div>
      </div>
    </div>`;
  hydrateIcons();

  /* 1 · scroll-spy rail — whichever section rides the viewport centre
     lights its link; clicking a link glides the dossier to that section */
  if (window.__cvCleanup) window.__cvCleanup();
  const links = [...$$(".cv-rail-link", $("#committee-view"))];
  const spy = new IntersectionObserver(
    (entries) => {
      for (const en of entries) {
        if (!en.isIntersecting) continue;
        links.forEach((l) => l.classList.toggle("on", l.dataset.cv === en.target.id.slice(3)));
      }
    },
    { rootMargin: "-40% 0px -55% 0px" }
  );
  $$("[data-cv-sec]", $("#committee-view")).forEach((sec) => spy.observe(sec));
  links.forEach((l) =>
    l.addEventListener("click", () => {
      document.getElementById(`cv-${l.dataset.cv}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    })
  );

  /* 2 · reading progress — a crimson hairline under the nav fills as
     the dossier is read; cleaned up on the next render */
  const fill = $("#cv-progress-fill");
  const progress = () => {
    if (!fill || !fill.isConnected) return;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    fill.style.transform = `scaleX(${max > 0 ? Math.min(1, window.scrollY / max) : 0})`;
  };
  window.addEventListener("scroll", progress, { passive: true });
  progress();
  window.__cvCleanup = () => {
    spy.disconnect();
    window.removeEventListener("scroll", progress);
  };

  /* Committees veiled — the dossier renders in place, blurred + inert under
     a "Coming Soon" stamp (same treatment as the register wizard box). The
     crumb stays live so visitors can head back to the committees page. */
  if (!CONFIG.COMMITTEES_REVEALED) {
    const wrap = $(".page-wrap", $("#committee-view"));
    wrap.classList.add("is-veiled");
    $(".committee-head", wrap).setAttribute("inert", "");
    $(".committee-grid", wrap).setAttribute("inert", "");
    const veil = document.createElement("div");
    veil.className = "reg-veil";
    veil.innerHTML = `
      <span class="veil-kicker">Sealed Dossier</span>
      <span class="reg-veil-stamp">Coming Soon</span>
      <span class="reg-veil-sub">This dossier unseals with the committees reveal.</span>`;
    wrap.append(veil);
    /* land at the top so the seal is the first thing on screen regardless
       of browser scroll restoration */
    window.scrollTo(0, 0);
  }
  renderedCommittee = slug;
  return true;
}

/* ————————————————— FAQ list (data.js · FAQS) ————————————————— */

{
  const el = $("#faq-list");
  if (el) {
    el.innerHTML = FAQS.map((f, i) => `
      <details class="faq-item reveal" data-delay="${(i * 0.05).toFixed(2)}"${i === 0 ? " open" : ""}>
        <summary class="faq-q">
          <span class="faq-num">${pad2(i + 1)}</span>
          <span class="faq-q-text">${f.q}</span>
          <i data-icon="chevron-down" data-cls="faq-chev"></i>
        </summary>
        <div class="faq-a"><p>${f.a}</p></div>
      </details>`).join("");
  }
}

/* ————————————————— Executive board cards (all TBA) ————————————————— */

{
  $("#exec-grid").innerHTML = COMMITTEES.map((c, i) => `
    <div class="reveal" data-delay="${(i * 0.04).toFixed(2)}">
      <div class="exec-card">
        <div class="exec-card-top">
          <div>
            <h3 class="exec-acronym">${c.acronym}</h3>
            <p class="exec-name">${c.name}</p>
          </div>
          <span class="exec-num" aria-hidden="true">${ROMAN[i]}</span>
        </div>
        <div class="exec-divider"></div>
        <ul class="exec-roles">
          ${["Chair", "Vice Chair", "Secretary"].map((r) => `
            <li class="exec-role">
              <span class="exec-role-name">${r}</span>
              <span class="exec-role-tba"><i data-icon="lock"></i>to be announced</span>
            </li>`).join("")}
        </ul>
      </div>
    </div>`).join("");
}

/* ————————————————— Resources — archive shelf + guides index ———————
   Three shelf cards (adjusted 3-up row) lead the page; the per-committee
   guides index follows below. Released documents land straight from
   Supabase the moment rows flip to released = true — a released category
   unlocks its card's Download button; a released committee row unlocks
   its guide download. */

const RES_META = [
  { ic: "book-open", no: "01", title: "Background Guides", cat: "study-guides", desc: "Committee-wise guides and agenda briefs in depth — everything you need before the first roll call." },
  { ic: "scroll-text", no: "02", title: "Rules of Procedure", cat: "rules", desc: "The SOMUN rules of procedure — motions, precedence and draft-resolution mechanics, the fine print of every chamber." },
  { ic: "book-marked", no: "03", title: "Delegate Handbook", cat: "handbook", desc: "Venue maps, dress code, kit details and conference etiquette — your pocket companion for the three days." },
];

/* released[key] = { url } filled from Supabase (or left empty) */
const releasedRes = {};

function renderResourceCards() {
  $("#res-grid").innerHTML = RES_META.map((r, i) => {
    const rel = releasedRes[r.cat];
    const foot = rel
      ? `<a class="res-dl" href="${rel.url}" target="_blank" rel="noopener">Download</a>`
      : `<span class="res-foot-label">PDF · coming to this shelf</span>
         <span class="stamp stamp--sm"><span class="stamp-diamond"></span>Soon</span>`;
    return `
    <div class="reveal" data-delay="${(i * 0.06).toFixed(2)}">
      <div class="res-card">
        <div class="res-top">
          <span class="res-icon"><i data-icon="${r.ic}"></i></span>
          <span class="res-num" aria-hidden="true">${r.no}</span>
        </div>
        <h3 class="res-title">${r.title}</h3>
        <p class="res-desc">${r.desc}</p>
        <div class="res-foot">${foot}</div>
      </div>
    </div>`;
  }).join("");
  hydrateIcons($("#res-grid"));
  /* every render builds fresh .reveal wrappers — any render after boot must
     be re-observed or the cards keep their layout slot but never leave
     opacity:0 (the missing-three-boxes bug: the live Supabase re-render
     replaced the boot-observed wrappers with clones IO never saw). The boot
     pass picks the first batch up via __observeReveals() at script end. */
  window.__observeReveals?.();
}

renderResourceCards();

function renderGuidesIndex(guides) {
  $("#guides-list").innerHTML = COMMITTEES.map((c) => {
    const url = guides[c.acronym];
    const status = url
      ? `<a class="guide-dl" href="${url}" target="_blank" rel="noopener">Download guide ↓</a>`
      : `<span class="guide-status"><span class="guide-diamond"></span>releasing soon</span>`;
    return `<li class="guide-row"><span class="guide-acronym">${c.acronym}</span>${status}</li>`;
  }).join("");
}

renderGuidesIndex({});

/* pull released resources from Supabase when configured */
if (supabaseConfigured()) {
  sb(`${CONFIG.RESOURCES_TABLE}?released=eq.true&select=*`)
    .then((rows) => {
      const guides = {};
      for (const r of rows || []) {
        if (r.committee) guides[r.committee] = r.file_url;
        if (r.category && RES_META.some((m) => m.cat === r.category)) {
          releasedRes[r.category] = { url: r.file_url };
        }
      }
      renderResourceCards();
      renderGuidesIndex(guides);
      if ((rows || []).length > 0) $("#guides-stamp")?.remove();
    })
    .catch(() => {/* silently keep placeholders if the table is missing */});
}

/* ————————————————— Fees sidebar ————————————————— */

{
  $("#fees-list").innerHTML = FEES.map((f) => `
    <li class="fee-item">
      <div class="fee-row">
        <span class="fee-label">${f.label}</span>
        <span class="fee-price">${f.standard !== f.early ? `<s class="fee-strike">${f.standard}</s>` : ""}${f.early}</span>
      </div>
      <p class="fee-note">${f.note}</p>
    </li>`).join("");
}

/* ————————————————— Committee selects ————————————————— */

$$("[data-committee-select]").forEach((sel) => {
  sel.innerHTML =
    `<option value="">Select a committee</option>` +
    REG_OPTIONS.map((c) => `<option value="${c.slug}">${c.acronym} — ${c.name}</option>`).join("");
});

/* ————————————————— Router ————————————————— */

const VIEWS = ["home", "about", "committees", "committee", "itinerary", "resources", "register", "verify", "faqs"];
const HASHES = {
  home: "#/",
  about: "#/about",
  committees: "#/committees",
  itinerary: "#/itinerary",
  resources: "#/resources",
  register: "#/register",
  verify: "#/verify",
  faqs: "#/faqs",
};

let currentCommittee = null; // slug for the #/committees/<slug> detail view
let renderedCommittee = null; // slug currently painted into #committee-view

function viewFromHash() {
  const h = window.location.hash.replace(/^#\/?/, "").split("?")[0];
  const seg = h.split("/").filter(Boolean);
  if (seg[0] === "committees" && seg[1]) {
    currentCommittee = seg[1];
    return "committee";
  }
  if (seg[0] === "faqs") return "faqs";
  return VIEWS.includes(h) ? h : "home";
}

let currentView = viewFromHash();

function setActiveNav(view) {
  const navKey = view === "committee" ? "committees" : view; // detail page keeps the deck's nav item lit
  $$(".nav-link, .drawer-link").forEach((el) => {
    el.classList.toggle("active", el.dataset.nav === navKey);
  });
}

function showView(view, { animate = true } = {}) {
  const target = $(`.view[data-view="${view}"]`);
  if (!target) return;
  /* a previous exit left a fill:forwards opacity:0 on this view (Web
     Animations hold their effect until cancelled) — clear it or the
     page would re-enter invisible */
  target.getAnimations().forEach((a) => a.cancel());
  if (view === "committee") {
    /* render the requested dossier before the entrance runs; unknown
       slugs fall back to the deck */
    if (!renderCommitteePage(currentCommittee)) {
      window.location.replace("#/committees");
      showView("committees", { animate });
      return;
    }
    /* the page's reveals were rendered just now (boot observed before
       this content existed) — observe them or they stay invisible */
    if (window.__observeReveals) window.__observeReveals();
  }
  $$(".view").forEach((v) => v.classList.remove("active", "view-enter"));
  target.classList.add("active");
  if (animate) {
    target.classList.remove("view-enter");
    void target.offsetWidth; // restart the entrance animation
    target.classList.add("view-enter");
    /* replays scroll-reveals on every visit, like the remount did */
    if (window.__rearmReveals) window.__rearmReveals(target);
  }
  /* register remounted fresh each visit in the original — same here */
  if (view === "register") {
    const s = $("#reg-success");
    const f = $("#reg-form-wrap");
    if (s) s.hidden = true;
    if (f) f.hidden = false;
    if (window.__regReset) window.__regReset(); /* wizard back to stage I */
  }
  /* verification console — session key is re-checked lazily on entry */
  if (view === "verify" && window.__verifyEnter) window.__verifyEnter();
  setActiveNav(view);
  if (view === "home" && window.__litText) requestAnimationFrame(window.__litText);
  if (view === "about" && window.__aboutEnter) requestAnimationFrame(window.__aboutEnter);
  requestAnimationFrame(() => window.scrollTo({ top: 0 }));
  if (view === "committees" && CONFIG.COMMITTEES_REVEALED) deckOnShow();
}

function transitionTo(view) {
  if (view === currentView) {
    /* committee → committee is the same view but a different dossier —
       re-render the new slug instead of just scrolling back up */
    if (view === "committee" && renderedCommittee !== currentCommittee) {
      showView(view);
      window.scrollTo(0, 0);
      return;
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
    setActiveNav(view);
    return;
  }
  const from = $(`.view[data-view="${currentView}"]`);
  currentView = view;
  if (!from) {
    showView(view);
    return;
  }
  /* replicate the old AnimatePresence "wait": exit 450ms, then enter */
  from.animate(
    [
      { opacity: 1, transform: "none" },
      { opacity: 0, transform: "translateY(-8px)" },
    ],
    { duration: 450, easing: EASE, fill: "forwards" }
  ).addEventListener("finish", () => {
    showView(view);
  });
}

window.addEventListener("hashchange", () => transitionTo(viewFromHash()));

/* all [data-nav] buttons navigate */
document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-nav]");
  if (!btn) return;
  const view = btn.dataset.nav;
  closeDrawer();
  const targetHash = HASHES[view];
  if (window.location.hash === targetHash || (view === "home" && (window.location.hash === "" || window.location.hash === "#"))) {
    transitionTo(view);
  } else {
    window.location.hash = targetHash;
  }
});

/* [data-committee] buttons open that committee's own page */
/* ————— Registrations veiled: the wizard box renders blurred + inert under an
   "Opening Soon" stamp (fees sidebar, headings and CTAs stay normal).
   Flip CONFIG.REGISTRATIONS_OPEN in config.js to release. ————— */
if (!CONFIG.REGISTRATIONS_OPEN) {
  const regBox = $("#reg-box");
  if (regBox) {
    regBox.classList.add("is-veiled");
    regBox.setAttribute("inert", "");
    const veil = document.createElement("div");
    veil.className = "reg-veil";
    const stamp = document.createElement("span");
    stamp.className = "reg-veil-stamp";
    stamp.textContent = "Opening Soon";
    const sub = document.createElement("span");
    sub.className = "reg-veil-sub";
    sub.textContent = "Registrations haven’t opened yet — the portal goes live shortly.";
    veil.append(stamp, sub);
    regBox.append(veil);
  }
  /* hero status pill must not contradict the veil */
  const heroRegens = $(".hero-regens");
  if (heroRegens) {
    heroRegens.classList.add("is-idle");
    const textNode = [...heroRegens.childNodes].find((n) => n.nodeType === 3 && n.textContent.trim());
    if (textNode) textNode.nodeValue = "Registrations Opening Soon";
  }
} else {
  /* portal open — the payment status lookup may face the world */
  $("#status-card")?.removeAttribute("hidden");
}

/* ————— Stage III payment panel: fee comes from CONFIG.REGISTRATION_FEE.
   While the fee is 0 (undisclosed) the panel keeps its placeholder copy.
   Once announced the amount fills in, and the copy follows the ACTIVE
   flow: Cashfree (if ever wired with an app id + fee) or the UPI QR
   auto-verification path. Exposed for re-render after config changes. ————— */
function renderPayStage() {
  const amt = $("#pay-amount");
  const badge = $("#pay-badge");
  const copy = $("#pay-copy");
  if (amt && feeAnnounced()) {
    amt.textContent = formatINR(CONFIG.REGISTRATION_FEE);
    if (badge) badge.textContent = "Per delegate · Group Delegation alike";
    if (copy) {
      const flow = payFlow();
      copy.textContent = flow === "cashfree"
        ? "You can settle the fee online right after submitting — UPI, cards and netbanking, checkout powered by Cashfree."
        : flow === "qr"
        ? "Right after you submit, the confirmation screen shows YOUR exact amount — the fee plus a personal paise ID that is yours alone. Pay it with the app button or the QR, then enter the UTR and attach the payment screenshot. The AI desk reads your shot instantly; the secretariat confirms against the bank statement."
        : "Online checkout is being wired up. Your fee is locked in — settle it from the confirmation screen or the payment link emailed to you.";
    }
  }
}
renderPayStage();
window.__renderPayStage = renderPayStage;

document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-committee]");
  if (!btn) return;
  closeDrawer();
  const hash = `#/committees/${btn.dataset.committee}`;
  if (window.location.hash === hash) {
    transitionTo("committee");
  } else {
    window.location.hash = hash;
  }
});

/* ————————————————— Nav scrolled state + drawer ————————————————— */

const navEl = $("#nav");
const onScroll = () => navEl.classList.toggle("scrolled", window.scrollY > 24);
onScroll();
window.addEventListener("scroll", onScroll, { passive: true });

const drawerEl = $("#drawer");
const toggleBtn = $("#nav-toggle");
function closeDrawer() {
  drawerEl.classList.remove("open");
  toggleBtn.classList.remove("open");
  toggleBtn.setAttribute("aria-expanded", "false");
}
toggleBtn.addEventListener("click", () => {
  const open = !drawerEl.classList.contains("open");
  drawerEl.classList.toggle("open", open);
  toggleBtn.classList.toggle("open", open);
  toggleBtn.setAttribute("aria-expanded", String(open));
});
$("#drawer-overlay").addEventListener("click", closeDrawer);

/* —— hero chrome wiring + nav veil ——
   The nav stays veiled while the hero holds the stage; the corner
   Menu button opens the drawer, and the nav slides back in the moment
   the hero scrolls away. */
{
  const heroEl = $("#hero");
  const heroMenu = $("#hero-menu");
  const exploreBtn = $("#hero-explore");

  heroMenu && heroMenu.addEventListener("click", () => toggleBtn.click());

  exploreBtn &&
    exploreBtn.addEventListener("click", () => {
      const about = document.querySelector(".about");
      about && about.scrollIntoView({ behavior: "smooth", block: "start" });
    });

  if (heroEl) {
    const veil = (hidden) => navEl.classList.toggle("nav--veil", hidden);
    if ("IntersectionObserver" in window) {
      veil(true); // the hero is the opening frame — start veiled
      new IntersectionObserver(
        (es) => veil(es[0].isIntersecting),
        { threshold: 0.12 }
      ).observe(heroEl);
    } else {
      const veilOnScroll = () =>
        veil(window.scrollY < heroEl.offsetHeight - 90);
      veilOnScroll();
      window.addEventListener("scroll", veilOnScroll, { passive: true });
    }
  }
}

/* ————————————————— Countdown ————————————————— */

{
  const target = new Date(CONFERENCE.countdownTarget).getTime();
  const cells = { d: $("#cd-d"), h: $("#cd-h"), m: $("#cd-m"), s: $("#cd-s") };
  const tick = () => {
    const diff = Math.max(0, target - Date.now());
    cells.d.textContent = pad2(Math.floor(diff / 86400000));
    cells.h.textContent = pad2(Math.floor((diff % 86400000) / 3600000));
    cells.m.textContent = pad2(Math.floor((diff % 3600000) / 60000));
    cells.s.textContent = pad2(Math.floor((diff % 60000) / 1000));
  };
  tick();
  setInterval(tick, 1000);
}

/* ————————————————— Reveal on scroll ————————————————— */

{
  const io = new IntersectionObserver(
    (entries) => {
      for (const en of entries) {
        if (en.isIntersecting) {
          en.target.style.setProperty("--rv-delay", `${en.target.dataset.delay || 0}s`);
          en.target.classList.add("in-view");
          io.unobserve(en.target);
        }
      }
    },
    { rootMargin: "0px 0px -60px 0px" }
  );
  const observeAll = () => $$(".reveal:not(.in-view)").forEach((el) => io.observe(el));
  observeAll();
  window.__observeReveals = observeAll; // re-run after dynamic renders
  /* the original remounted each view on every visit, so scroll-reveals replayed
     each time a page was entered — re-arm them to keep that choreography */
  window.__rearmReveals = (scope) => {
    $$(".reveal.in-view", scope).forEach((el) => {
      el.classList.remove("in-view");
      io.observe(el);
    });
  };
}

/* ————————————————— Scroll-lit text — The Conference —————————————————
   Every character in the home "The Conference" section starts grey +
   translucent and lights back to its own colour in reading order while
   the user scrolls — a scroll-scrubbed typing pass. The reveal
   completes when the lit text sits at the CENTRE of the viewport (the
   same contract as the About page's manifesto), never after it has
   scrolled past. Words are wrapped whole (inline-block) so
   line-wrapping is identical to plain text, and the original copy is
   exposed via aria-label for screen readers. */

{
  const root = $(".about");
  if (root) {
    const targets = $$(".section-head-title, .about-p, .about-item-text", root);
    const chars = [];
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const splitWords = (node) => {
      [...node.childNodes].forEach((child) => {
        if (child.nodeType === 3) {
          const frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) {
              frag.appendChild(document.createTextNode(" "));
              return;
            }
            const w = document.createElement("span");
            w.className = "stt-w";
            for (const ch of part) {
              const c = document.createElement("span");
              c.className = "stt-char";
              c.textContent = ch;
              w.appendChild(c);
              chars.push(c);
            }
            frag.appendChild(w);
          });
          node.replaceChild(frag, child);
        } else if (child.nodeType === 1 && child.tagName !== "BR") {
          splitWords(child); /* recurse into em/strong so their colour still owns the chars */
        }
      });
    };

    /* per-element char ranges — each block lights over its OWN trip from
       the viewport fold to the centre line, so a typing pass is always on
       screen while it runs (the old single global sweep spent its budget
       on the first paragraphs, leaving nothing to watch by the time the
       reader scrolled down) */
    const ranges = targets.map((el) => {
      const start = chars.length;
      el.setAttribute("aria-label", (el.textContent || "").replace(/\s+/g, " ").trim());
      const veil = document.createElement("span");
      veil.setAttribute("aria-hidden", "true");
      while (el.firstChild) veil.appendChild(el.firstChild);
      el.appendChild(veil);
      splitWords(veil);
      return { el, start, end: chars.length, lit: 0 };
    });

    if (reduceMotion) {
      chars.forEach((c) => c.classList.add("on"));
    } else {
      const renderRange = (rg, target) => {
        target = Math.max(0, Math.min(rg.end - rg.start, target));
        if (target === rg.lit) return;
        if (target > rg.lit) for (let i = rg.lit; i < target; i++) chars[rg.start + i].classList.add("on");
        else for (let i = rg.lit - 1; i >= target; i--) chars[rg.start + i].classList.remove("on");
        rg.lit = target;
      };
      const update = () => {
        const r = root.getBoundingClientRect();
        if (!r.height) {
          /* another view is on stage — reset for the replay */
          ranges.forEach((rg) => renderRange(rg, 0));
          return;
        }
        const vh = window.innerHeight || 1;
        ranges.forEach((rg) => {
          const b = rg.el.getBoundingClientRect();
          const enter = vh * 0.92;             /* first char as the block's top clears the fold */
          const done = vh * 0.5 - b.height / 2; /* last char lands as the block centres */
          const p = (enter - b.top) / Math.max(1, enter - done);
          renderRange(rg, Math.round(Math.max(0, Math.min(1, p)) * (rg.end - rg.start)));
        });
      };
      let queued = false;
      const onLit = () => {
        if (queued) return;
        queued = true;
        requestAnimationFrame(() => {
          queued = false;
          update();
        });
      };
      window.addEventListener("scroll", onLit, { passive: true });
      window.addEventListener("resize", onLit);
      window.addEventListener("hashchange", () => requestAnimationFrame(onLit));
      window.addEventListener("load", onLit);
      window.__litText = update; /* showView nudges this when home re-enters */
      update();
    }
  }
}

/* ————————————————— Home count-up stats —————————————————
   Hero strip + "by the numbers" file wall — figures ease up the first
   time they enter the viewport (same choreography as the About file). */

{
  const root = $(".view[data-view='home']");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const animate = (el) => {
    const end = Number(el.dataset.count) || 0;
    if (reduce) return (el.textContent = end);
    const t0 = performance.now();
    const dur = 1300;
    const step = (t) => {
      const p = Math.min(1, (t - t0) / dur);
      el.textContent = Math.round(end * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  const io = new IntersectionObserver(
    (entries) => {
      for (const en of entries) {
        if (en.isIntersecting) {
          animate(en.target);
          io.unobserve(en.target);
        }
      }
    },
    { rootMargin: "0px 0px -60px 0px" }
  );
  $$("[data-count]", root).forEach((el) => {
    /* hero stats can sit half-visible at load — the -60px margin would
       leave them stuck at 0. Anything already on screen counts now. */
    const r = el.getBoundingClientRect();
    if (r.top < window.innerHeight && r.bottom > 0) animate(el);
    else io.observe(el);
  });
}

/* ————————————————— Committees deck (pinned scroll) ————————————————— */

const deck = {
  el: $("#deck"),
  track: $("#deck-track"),
  slides: [],
  n: COMMITTEES.length,
  current: 0,
  active: 0,
  pos: 0,
  vel: 0,
  target: 0,
  running: false,
};

function deckSetCurrent(idx) {
  deck.current = idx;
  $("#deck-current").textContent = pad2(idx + 1);
  $("#deck-bar").style.width = `${((idx + 1) / deck.n) * 100}%`;
  deck.slides.forEach((s, i) => {
    s.classList.toggle("on-stage", i === idx);
    if (i === idx) {
      s.removeAttribute("aria-hidden");
      s.removeAttribute("inert");
    } else {
      s.setAttribute("aria-hidden", "true");
      s.setAttribute("inert", "");
    }
  });
  $$(".deck-num").forEach((b, i) => b.classList.toggle("active", i === idx));
  $("#deck-prev").disabled = idx === 0;
  $("#deck-next").disabled = idx === deck.n - 1;
}

function deckOnShow() {
  /* the deck remounted on every visit — strip the stage so the cascade
     (stagger, art zoom, watermark) replays from the top like before */
  deck.slides.forEach((s) => s.classList.remove("on-stage"));
  void deck.track.offsetWidth; // flush styles so transitions restart
  /* re-anchor when the view becomes visible (widths are measurable only now) */
  deck.pos = deck.target = deck.active * slideWidth();
  deck.vel = 0;
  deckSetCurrent(deck.active);
  deckOnScroll();
}

/* slides are 100% of the sticky viewport, which excludes the page scrollbar —
   never use window.innerWidth for the spring target */
function slideWidth() {
  return deck.slides[0] ? deck.slides[0].offsetWidth : window.innerWidth;
}

function deckOnScroll() {
  if (!deck.el) return;
  const rect = deck.el.getBoundingClientRect();
  const total = deck.el.offsetHeight - window.innerHeight;
  if (total <= 0) return;
  const p = Math.min(0.99999, Math.max(0, -rect.top / total));
  const t = Math.round(p * (deck.n - 1));
  if (t !== deck.active) {
    deck.active = t;
    deck.target = t * slideWidth();
    deckSetCurrent(t);
  }
}

/* spring integrator — stiffness 110, damping 24, mass 0.9 (as before) */
function deckFrame(t) {
  const last = deckFrame.last || t;
  const dt = Math.min(0.05, (t - last) / 1000);
  deckFrame.last = t;
  const k = 110, c = 24, m = 0.9;
  const F = -k * (deck.pos - deck.target) - c * deck.vel;
  deck.vel += (F / m) * dt;
  deck.pos += deck.vel * dt;
  deck.track.style.transform = `translate3d(${-deck.pos}px,0,0)`;
  requestAnimationFrame(deckFrame);
}

function deckInit() {
  deck.slides = $$(".deck-slide", deck.track);
  /* veiled: single-screen section — no pin run, the spring idles on slide 1
     behind the blur, and deckOnScroll's total <= 0 guard keeps it idle */
  deck.el.style.height = CONFIG.COMMITTEES_REVEALED
    ? `${Math.max(280, deck.n * 78)}vh`
    : "100vh";
  deckSetCurrent(0);
  window.addEventListener("scroll", deckOnScroll, { passive: true });
  window.addEventListener("resize", () => {
    deck.pos = deck.target = deck.active * slideWidth();
    deck.vel = 0;
  });
  requestAnimationFrame(deckFrame);
  $$(".deck-num").forEach((b) =>
    b.addEventListener("click", () => deckGoTo(Number(b.dataset.goto)))
  );
  $("#deck-prev").addEventListener("click", () => deckGoTo(deck.current - 1));
  $("#deck-next").addEventListener("click", () => deckGoTo(deck.current + 1));
}

function deckGoTo(idx) {
  const i = Math.min(deck.n - 1, Math.max(0, idx));
  const top = deck.el.offsetTop + (i / (deck.n - 1)) * (deck.el.offsetHeight - window.innerHeight);
  window.scrollTo({ top, behavior: "smooth" });
}

deckInit();

/* ————————————————— About page — dossier interactivity —————
   Seven scoped behaviours for the redesigned About view: crimson
   ticker fill, the scroll-lit origin manifesto (a scoped twin of
   the home module above), count-up stat wall, the one-open charter
   accordion, scroll-filled timeline spine, the config-gated
   "Meet the Secretariat" Instagram reveal, and the lazy-loaded
   live venue map exhibit (chapter VII). */

{
  const view = $('.view[data-view="about"]');
  if (view) {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /* 1 · crimson ticker band */
    {
      const words = ["SOMUN", "MMXXVI", "BORN IN HYDERABAD", "TWELVE CHAMBERS", "THREE DAYS", "WORDS, NOT WAR"];
      const row = words
        .map((w) => `<span class="ab-ticker-word">${w}</span><span class="ab-ticker-diamond"></span>`)
        .join("");
      $$("[data-ab-ticker]", view).forEach((el) => (el.innerHTML = row));
    }

    /* 2 · scroll-lit origin — every character starts grey and lights in
       reading order, and the reveal completes when the lit text sits
       at the centre of the viewport (not after it has scrolled past) */
    let litUpdate = null;
    {
      const targets = $$(".ab-lit", view);
      const chars = [];

      const splitWords = (node) => {
        [...node.childNodes].forEach((child) => {
          if (child.nodeType === 3) {
            const frag = document.createDocumentFragment();
            child.textContent.split(/(\s+)/).forEach((part) => {
              if (!part) return;
              if (/^\s+$/.test(part)) {
                frag.appendChild(document.createTextNode(" "));
                return;
              }
              const w = document.createElement("span");
              w.className = "stt-w";
              for (const ch of part) {
                const c = document.createElement("span");
                c.className = "stt-char";
                c.textContent = ch;
                w.appendChild(c);
                chars.push(c);
              }
              frag.appendChild(w);
            });
            node.replaceChild(frag, child);
          } else if (child.nodeType === 1 && child.tagName !== "BR") {
            splitWords(child);
          }
        });
      };

      targets.forEach((el) => {
        el.setAttribute("aria-label", (el.textContent || "").replace(/\s+/g, " ").trim());
        const veil = document.createElement("span");
        veil.setAttribute("aria-hidden", "true");
        while (el.firstChild) veil.appendChild(el.firstChild);
        el.appendChild(veil);
        splitWords(veil);
      });

      if (reduce) {
        chars.forEach((c) => c.classList.add("on"));
      } else {
        let lit = 0;
        const render = (target) => {
          target = Math.max(0, Math.min(chars.length, target));
          if (target === lit) return;
          if (target > lit) for (let i = lit; i < target; i++) chars[i].classList.add("on");
          else for (let i = lit - 1; i >= target; i--) chars[i].classList.remove("on");
          lit = target;
        };
        const update = () => {
          const r = view.getBoundingClientRect();
          if (!r.height) return render(0); /* another view is on stage — reset for the replay */
          const vh = window.innerHeight || 1;
          const a = targets[0].getBoundingClientRect();
          const b = targets[targets.length - 1].getBoundingClientRect();
          const top = Math.min(a.top, b.top);
          const blockH = b.bottom - a.top;
          const start = vh * 0.9;             /* first chars light as the block enters */
          const done = vh * 0.5 - blockH / 2; /* last char lands when the block is centred */
          const p = (start - top) / Math.max(1, start - done);
          render(Math.round(Math.max(0, Math.min(1, p)) * chars.length));
        };
        let queued = false;
        const onScroll = () => {
          if (queued) return;
          queued = true;
          requestAnimationFrame(() => {
            queued = false;
            update();
          });
        };
        window.addEventListener("scroll", onScroll, { passive: true });
        window.addEventListener("resize", onScroll);
        litUpdate = update;
        update();
      }
    }

    /* 3 · the file — stat figures count up the first time they enter */
    {
      const animate = (el) => {
        const end = Number(el.dataset.count) || 0;
        if (reduce) return (el.textContent = end);
        const t0 = performance.now();
        const dur = 1300;
        const step = (t) => {
          const p = Math.min(1, (t - t0) / dur);
          el.textContent = Math.round(end * (1 - Math.pow(1 - p, 3)));
          if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      };
      const io = new IntersectionObserver(
        (entries) => {
          for (const en of entries) {
            if (en.isIntersecting) {
              animate(en.target);
              io.unobserve(en.target);
            }
          }
        },
        { rootMargin: "0px 0px -60px 0px" }
      );
      $$("[data-count]", view).forEach((el) => io.observe(el));
    }

    /* 4 · the charter — one article open at a time */
    {
      const articles = $$(".ab-article", view);
      articles.forEach((art) => {
        const head = $(".ab-article-head", art);
        head.addEventListener("click", () => {
          const wasOpen = art.classList.contains("open");
          articles.forEach((a) => {
            a.classList.remove("open");
            $(".ab-article-head", a).setAttribute("aria-expanded", "false");
          });
          if (!wasOpen) {
            art.classList.add("open");
            head.setAttribute("aria-expanded", "true");
          }
        });
      });
    }

    /* 5 · the road to the gavel — the spine fills crimson as it scrolls
       past, and each milestone lights when the fill reaches its node */
    let tlUpdate = null;
    {
      const tl = $("#ab-timeline", view);
      const fill = $("#ab-tl-fill", view);
      const items = $$(".ab-tl-item", view);
      const update = () => {
        const r = tl.getBoundingClientRect();
        if (!r.height) return;
        const vh = window.innerHeight || 1;
        const lead = vh * 0.68; /* the line's leading edge rides at 68% of the viewport */
        const px = Math.max(0, Math.min(r.height, lead - r.top));
        fill.style.height = `${(px / r.height) * 100}%`;
        for (const item of items) {
          const node = $(".ab-tl-node", item);
          item.classList.toggle("lit", px >= node.offsetTop - 2);
        }
      };
      let queued = false;
      const onScroll = () => {
        if (queued) return;
        queued = true;
        requestAnimationFrame(() => {
          queued = false;
          update();
        });
      };
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", onScroll);
      tlUpdate = update;
      update();
    }

    /* 6 · meet the secretariat — no embed: the chapter card carries a
       single CTA whose href comes from CONFIG.SECRETARIAT_POST_URL (no
       URL configured → a "link goes live" hint shows instead). While
       SECRETARIAT_REVEALED is false the card renders blurred + inert
       under a "Coming Soon" stamp. Flip the flag in config.js on drop
       day; the same file carries the post link, so a new post needs
       zero code edits. */
    {
      const box = $("#ab-secretariat", view);
      const btn = $("#ab-sec-btn", view);
      const hint = $("#ab-sec-hint", view);
      if (box) {
        const url = (CONFIG.SECRETARIAT_POST_URL || "").trim();
        if (url && btn) {
          btn.href = url;
          btn.hidden = false;
        } else if (hint) {
          hint.hidden = false;
        }
        if (!CONFIG.SECRETARIAT_REVEALED) {
          box.classList.add("is-veiled");
          box.setAttribute("inert", "");
          const veil = document.createElement("div");
          veil.className = "reg-veil ab-sec-veil";
          veil.innerHTML = `
            <span class="veil-kicker">Secretariat Messages</span>
            <p class="veil-line">The team takes the stage <em>soon.</em></p>
            <span class="reg-veil-stamp">Coming Soon</span>
            <span class="reg-veil-sub">Every sec's message and the top-seven board are drafted — this box unblurs the moment the post drops.</span>`;
          box.append(veil);
        }
      }
    }

    /* 7 · the grounds — the venue exhibit stays sealed until the map
       panel scrolls near; the Google embed then loads once and the
       veil fades. Once loaded it stays loaded across view swaps. */
    {
      const map = $("#ab-map", view);
      const frame = map ? $(".ab-map-frame", map) : null;
      if (CONFIG.VENUE_REVEALED && map && frame && frame.dataset.src && !frame.getAttribute("src")) {
        const arm = () => {
          frame.setAttribute("src", frame.dataset.src);
          frame.addEventListener("load", () => map.classList.add("is-loaded"), { once: true });
        };
        if (reduce || !("IntersectionObserver" in window)) {
          arm();
        } else {
          const io = new IntersectionObserver(
            (entries) => {
              if (entries.some((en) => en.isIntersecting)) {
                io.disconnect();
                arm();
              }
            },
            { rootMargin: "260px 0px" }
          );
          io.observe(map);
        }
      }
    }

    /* re-entry hook — showView calls this so the choreography replays
       on every visit, exactly like the home scroll-lit module */
    window.__aboutEnter = () => {
      if (litUpdate) requestAnimationFrame(litUpdate);
      if (tlUpdate) requestAnimationFrame(tlUpdate);
    };
  }
}

/* ————————————————— Entry gate ————————————————— */

{
  const gate = $("#gate");
  const site = $("#site");
  const enterBtn = $("#gate-enter");
  const crest = $("#gate-crest");

  let opened = false;
  try {
    opened = sessionStorage.getItem("somun-entered") === "1";
  } catch {
    opened = false;
  }

  if (opened) {
    gate.remove();
    site.hidden = false;
    showView(currentView, { animate: false });
  } else {
    document.body.style.overflow = "hidden";
    setTimeout(() => enterBtn.focus({ preventScroll: true }), 1700);

    /* mouse parallax on the crest (spring-smoothed) */
    let tx = 0, ty = 0, cx = 0, cy = 0;
    gate.addEventListener("mousemove", (e) => {
      if (opened) return;
      const r = gate.getBoundingClientRect();
      tx = (e.clientX - r.left) / r.width;
      ty = (e.clientY - r.top) / r.height;
    });
    (function tilt() {
      cx += (tx - cx) * 0.08;
      cy += (ty - cy) * 0.08;
      crest.style.transform = `rotateX(${(0.5 - cy) * 9}deg) rotateY(${(cx - 0.5) * 9}deg)`;
      requestAnimationFrame(tilt);
    })();

    enterBtn.addEventListener("click", () => {
      if (opened) return;
      opened = true;
      try {
        sessionStorage.setItem("somun-entered", "1");
      } catch { /* private mode */ }
      gate.classList.add("open");
      document.body.style.overflow = "";
      site.hidden = false;
      showView(currentView, { animate: false });
      setTimeout(() => gate.remove(), 1550);
    });
  }
}

/* ————————————————— Itinerary (teaser vs full) ————————————————— */

if (SHOW_ITINERARY) {
  $("#itin-soon").hidden = true;
  $("#itin-full").hidden = false;
  let dayIdx = 0;

  const TYPE_META = {
    ceremony: { label: "Ceremony", cls: "event-chip--ceremony", ic: "flag" },
    session: { label: "Committee Session", cls: "event-chip--session", ic: "gavel" },
    break: { label: "Meal / Break", cls: "event-chip--break", ic: "coffee" },
    social: { label: "Socials & Press", cls: "event-chip--social", ic: "party-popper" },
  };

  function renderDay() {
    const d = ITINERARY[dayIdx];
    $("#itin-timeline").innerHTML = d.events.map((e, i) => {
      const m = TYPE_META[e.type] || TYPE_META.session;
      return `
      <li class="itin-event" style="animation: fadeUpSm .4s ${EASE} ${(i * 0.06).toFixed(2)}s both">
        <div class="event-head">
          <span class="event-time">${e.time}</span>
          <span class="event-chip ${m.cls}">${m.label}</span>
        </div>
        <h3 class="event-title">${e.title}</h3>
        <p class="event-detail">${e.detail}</p>
      </li>`;
    }).join("");
    $$(".itin-tab").forEach((t, i) => {
      t.classList.toggle("active", i === dayIdx);
      t.setAttribute("aria-selected", String(i === dayIdx));
    });
  }

  $("#itin-tabs").innerHTML = ITINERARY.map((d, i) => `
    <button class="itin-tab" role="tab" data-day="${i}">
      <span class="itin-tab-day">${d.day}</span>
      <span class="itin-tab-meta">${d.weekday} · ${d.date}</span>
    </button>`).join("");
  $("#itin-tabs").addEventListener("click", (e) => {
    const t = e.target.closest("[data-day]");
    if (t) { dayIdx = Number(t.dataset.day); renderDay(); }
  });
  renderDay();
}

/* ————————————————— Register form — 4-stage wizard (Supabase) ————— */

{
  const form = $("#reg-form");
  const submitBtn = $("#reg-submit");
  const label = $("#reg-submit-label");
  const stages = $$(".reg-stage", form);
  const steps = $$("#reg-stages .stage-step");
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  let cur = 0;

  /* the personal invoice (base fee + unique paise watermark) returned by
     the registration RPC — consumed by armPayQR and submitUTR */
  let payInvoice = null;

  function makeRefCode() {
    const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return `SM26-${code}`;
  }

  /* ——— stage engine ——— */
  function validateStage(n) {
    const val = (id) => $(`#${id}`).value.trim();
    if (n === 0) {
      if (val("fullName").length < 3) return "Please enter your full name.";
      if (!EMAIL_RE.test(val("email"))) return "Please enter a valid email address.";
      if (!$("#email-confirm").checked) return "Please confirm your email is correct — it is the only way we can reach you.";
      if (val("phone").replace(/\D/g, "").length < 8) return "Please enter a valid phone number.";
      if (!val("institution")) return "Institution / organisation is required.";
    }
    if (n === 1 && !$("#pref1").value) return "Please choose at least one committee preference.";
    return null;
  }

  function show(n) {
    cur = Math.max(0, Math.min(stages.length - 1, n));
    stages.forEach((s, i) => s.classList.toggle("is-active", i === cur));
    steps.forEach((st, i) => {
      st.classList.toggle("is-current", i === cur);
      st.classList.toggle("is-done", i < cur);
    });
  }

  /* click delegation for Continue / Back (submit button excluded) */
  form.addEventListener("click", (e) => {
    const next = e.target.closest("[data-next]");
    const back = e.target.closest("[data-back]");
    if (next) {
      const err = validateStage(cur);
      if (err) return showToast(`<strong>Almost there</strong>${err}`, true);
      show(cur + 1);
    }
    if (back) show(cur - 1);
  });

  /* Enter key anywhere advances like Continue; the real submit only
     fires from the last stage */
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (cur < stages.length - 1) {
      const err = validateStage(cur);
      if (err) return showToast(`<strong>Almost there</strong>${err}`, true);
      return show(cur + 1);
    }
    if (submitBtn.classList.contains("submitting")) return;

    const val = (id) => $(`#${id}`).value.trim();
    const payload = {
      fullName: val("fullName"),
      email: val("email").toLowerCase(),
      phone: val("phone"),
      institution: val("institution"),
      gradeOrTitle: val("gradeOrTitle"),
      experience: $("#experience").value || "novice",
      committeePref1: $("#pref1").value,
      committeePref2: $("#pref2").value,
      committeePref3: $("#pref3").value,
      portfolio: val("portfolio"),
      notes: val("notes"),
    };

    if (!supabaseConfigured()) {
      return showToast(
        "<strong>Service not configured</strong>Registration opens shortly — meanwhile write to " + CONFERENCE.email + ".",
        true
      );
    }

    submitBtn.classList.add("submitting");
    submitBtn.disabled = true;
    label.textContent = "Submitting…";

    const refCode = makeRefCode();
    const row = {
      ref_code: refCode,
      full_name: payload.fullName,
      email: payload.email,
      phone: payload.phone,
      institution: payload.institution,
      grade_or_title: payload.gradeOrTitle || null,
      experience: payload.experience,
      committee_pref1: payload.committeePref1,
      committee_pref2: payload.committeePref2 || null,
      committee_pref3: payload.committeePref3 || null,
      portfolio: payload.portfolio || null,
      notes: payload.notes || null,
    };

    try {
      let code = refCode;
      let invoice = null;
      try {
        /* the RPC door (supabase/payment.sql): server-side validation,
           the unique-paise invoice, no dependence on insert policies */
        const out = await sb("rpc/register_delegate", {
          method: "POST",
          body: JSON.stringify({
            p_ref_code: refCode,
            p_full_name: payload.fullName,
            p_email: payload.email,
            p_phone: payload.phone,
            p_institution: payload.institution,
            p_grade_or_title: payload.gradeOrTitle || null,
            p_experience: payload.experience,
            p_pref1: payload.committeePref1,
            p_pref2: payload.committeePref2 || null,
            p_pref3: payload.committeePref3 || null,
            p_portfolio: payload.portfolio || null,
            p_notes: payload.notes || null,
          }),
        });
        code = (out && out.ref_code) || refCode;
        invoice = (out && out.invoice) || null;
      } catch (rpcErr) {
        /* RPC not installed yet → legacy direct insert (schema.sql path) */
        if (!/could not find the function|pgrst202|schema cache/i.test(String(rpcErr.message || ""))) throw rpcErr;
        const inserted = await sb(CONFIG.REGISTRATIONS_TABLE, {
          method: "POST",
          headers: { Prefer: "return=representation" },
          body: JSON.stringify(row),
        });
        code = (Array.isArray(inserted) && inserted[0] && inserted[0].ref_code) || refCode;
      }
      $("#refcode").textContent = code;
      $("#reg-form-wrap").hidden = true;
      $("#reg-success").hidden = false;
      armPayNow(code, invoice);
      showToast(`<strong>Registration received</strong>Your reference code is ${code}.`);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      const msg = String(err.message || "");
      const hint = /row-level security|permission denied/i.test(msg)
        ? " The registration desk isn't installed on the database yet — run supabase/payment.sql in the SQL Editor."
        : "";
      showToast(`<strong>Could not submit</strong>${msg || "Unexpected error. Please retry."}${hint}`, true);
    } finally {
      submitBtn.classList.remove("submitting");
      submitBtn.disabled = false;
      label.textContent = "Submit Application";
    }
  });

  /* ——— online payment (Cashfree via Supabase Edge Functions) ———
     Dormant until CONFIG carries both CASHFREE_APP_ID and a fee. The
     browser only ever talks to the two edge functions — the Cashfree
     secret key stays server-side, never in this file. Flow:
     create-payment → { order_id, payment_session_id } → Cashfree SDK
     modal checkout → verify-payment flips the box to "Payment received". */
  function loadCashfreeSDK() {
    if (window.Cashfree) return Promise.resolve(window.Cashfree);
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
      s.onload = () => resolve(window.Cashfree);
      s.onerror = () => reject(new Error("Could not load the payment checkout. Check your connection and retry."));
      document.head.append(s);
    });
  }

  async function payNow(refCode) {
    const fnBase = `${CONFIG.SUPABASE_URL.replace(/\/$/, "")}/functions/v1`;
    const headers = {
      "Content-Type": "application/json",
      apikey: CONFIG.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${CONFIG.SUPABASE_ANON_KEY}`,
    };
    const created = await fetch(`${fnBase}/create-payment`, {
      method: "POST",
      headers,
      body: JSON.stringify({ ref_code: refCode }),
    });
    if (!created.ok) {
      const e = await created.json().catch(() => ({}));
      throw new Error(e.error || "Payment could not be started. Please retry in a moment.");
    }
    const { order_id, payment_session_id } = await created.json();
    const CF = await loadCashfreeSDK();
    const cashfree = new CF({ mode: CONFIG.CASHFREE_MODE });
    try {
      await cashfree.checkout({ paymentSessionId: payment_session_id, redirectTarget: "_modal" });
    } catch (_) { /* modal closed/abandoned — verification decides the state */ }
    const verified = await fetch(`${fnBase}/verify-payment`, {
      method: "POST",
      headers,
      body: JSON.stringify({ order_id, ref_code: refCode }),
    });
    if (!verified.ok) {
      const e = await verified.json().catch(() => ({}));
      throw new Error(e.error || "We could not confirm the payment just yet — if you were charged, the secretariat will reconcile it.");
    }
    return verified.json();
  }

  function armPayNow(refCode, invoice) {
    const box = $("#pay-now-box");
    const btn = $("#pay-now-btn");
    if (box && btn && cashfreeEnabled()) {
      $("#pay-now-amount").textContent = formatINR(CONFIG.REGISTRATION_FEE);
      box.hidden = false;
      btn.addEventListener("click", async () => {
        if (btn.classList.contains("submitting")) return;
        btn.classList.add("submitting");
        btn.disabled = true;
        const label = $("#pay-now-label");
        const prev = label.textContent;
        label.textContent = "Opening checkout…";
        try {
          const result = await payNow(refCode);
          if (result && result.status === "PAID") {
            box.classList.add("is-paid");
            label.textContent = "Payment received — see you at the table.";
            showToast(`<strong>Payment received</strong>Your fee is settled. The receipt travels to ${$("#email") ? $("#email").value : "your email"}.`);
          } else {
            label.textContent = prev;
            showToast("<strong>Payment pending</strong>If the checkout closed early you can retry — or wait for the email receipt.", true);
          }
        } catch (err) {
          label.textContent = prev;
          showToast(`<strong>Payment not completed</strong>${err.message || "Please retry."}`, true);
        } finally {
          btn.classList.remove("submitting");
          btn.disabled = false;
        }
      });
      return;
    }
    armPayQR(refCode, invoice);
  }

  /* ——— UPI payment (the no-gateway watermark path) ———
     The delegate is invoiced the base fee + a UNIQUE paise suffix — the
     paise are the payment's identity. They pay that exact amount (app
     deep link or QR), submit the UTR + success screenshot. Nothing is
     verified in the browser: the AI desk reads the shot advisory-style,
     and the secretariat reconciles the bank statement in #/verify —
     a credit matches its row by UTR first, then by its unique amount,
     and only then does the row flip paid. ——— */
  function armPayQR(refCode, invoice) {
    if (payFlow() !== "qr") return; // fee undisclosed → nothing to pay yet
    const box = $("#pay-qr-box");
    if (!box || box.dataset.armed) return;
    box.dataset.armed = "1";
    box.hidden = false;

    /* the personal watermark invoice — falls back to the flat base fee
       on the legacy no-RPC path */
    payInvoice = invoice && invoice.amount != null ? invoice : null;
    const amount = payInvoice ? Number(payInvoice.amount) : Number(CONFIG.REGISTRATION_FEE);
    $("#pay-qr-amount").textContent = formatINR(amount);

    const exactEl = $("#pay-qr-exact");
    if (exactEl) {
      exactEl.innerHTML = payInvoice && payInvoice.paise != null
        ? `Pay the <strong>EXACT</strong> amount — the paise (<strong>.${esc(String(payInvoice.paise).padStart(2, "0"))}</strong>) are your personal payment ID. A different amount cannot be matched to you.`
        : `Pay the <strong>EXACT</strong> fee — it must match to the rupee for verification.`;
      exactEl.hidden = false;
    }

    /* QR plate: the image, or a graceful engraved placeholder until the
       treasurer drops images/payment-qr.png (a UPI id shown as text is
       always enough to pay) */
    const img = $("#pay-qr-img");
    const empty = $("#pay-qr-empty");
    const vpa = ((payInvoice && payInvoice.vpa) || (CONFIG.UPI_QR && CONFIG.UPI_QR.UPI_ID) || "").trim();
    const payeeName = (payInvoice && payInvoice.payee_name) || (CONFIG.UPI_QR && CONFIG.UPI_QR.PAYEE_NAME) || "SOMUN '26";
    const imgSrc = ((CONFIG.UPI_QR && CONFIG.UPI_QR.IMAGE) || "").trim();
    if (imgSrc) {
      img.addEventListener("load", () => { img.hidden = false; empty.hidden = true; }, { once: true });
      img.addEventListener("error", () => {
        img.hidden = true;
        empty.hidden = Boolean(vpa);
        if (!vpa) {
          const t = empty.querySelector("span");
          if (t) t.textContent = "The QR is being engraved — pay via the UPI ID the secretariat shares, then submit the UTR below.";
        }
      }, { once: true });
      img.src = imgSrc;
    } else {
      empty.hidden = false;
    }

    if (vpa) {
      const vpaEl = $("#pay-qr-vpa");
      vpaEl.textContent = vpa;
      vpaEl.hidden = false;
      const cp = $("#pay-qr-copy");
      cp.hidden = false;
      cp.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(vpa);
          cp.classList.add("is-copied");
          setTimeout(() => cp.classList.remove("is-copied"), 2200);
          showToast("<strong>UPI ID copied</strong>Paste it into any UPI app and pay the exact fee.");
        } catch {
          showToast("Couldn't reach the clipboard — note the UPI ID down manually.", true);
        }
      });
    }

    /* "Pay via app" — the UPI deep link carries the exact watermark amount
       (apps may let the payer edit it; that breaks the watermark and the
       verification flags it — the copy above warns them) */
    const appBtn = $("#pay-app-btn");
    if (appBtn) {
      if (vpa) {
        appBtn.hidden = false;
        appBtn.addEventListener("click", () => {
          /* Bare-spec link: pa+am+cu only. Declared pn/tn params make some
             apps run their risk engine harder on intent payments; the app
             shows the VPA's registered name anyway, and the watermark
             amount — not the link — is what matches the payment. If an app
             still refuses, the delegate copies the UPI ID and pays manually
             (same amount, same watermark, verification unaffected). */
          const link = `upi://pay?pa=${encodeURIComponent(vpa)}&am=${amount.toFixed(2)}&cu=INR`;
          if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
            window.location.href = link;
          } else {
            showToast("<strong>Open this on your phone</strong>The app button launches your UPI app on a handset — from a laptop, scan the QR (or copy the UPI ID) and pay the exact amount shown.", true);
          }
        });
      } else {
        appBtn.hidden = true;
      }
    }

    $("#utr-submit").addEventListener("click", () => submitUTR(refCode));
  }

  function setUtrStatus(html, mood) {
    const el = $("#utr-status");
    if (!el) return;
    el.hidden = !html;
    el.innerHTML = html || "";
    el.className = "pay-qr-status" + (mood ? ` is-${mood}` : "");
  }

  /* screenshot is optional evidence — private bucket, delegate can only
     push (no read policy), the secretariat views it from the dashboard */
  async function uploadShot(refCode) {
    const input = $("#utr-shot");
    const file = input && input.files && input.files[0];
    if (!file) return null;
    if (file.size > 5 * 1024 * 1024) throw new Error("Screenshot is over 5 MB — pick a smaller one or continue without it.");
    const ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "png";
    const path = `${refCode}/${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const res = await fetch(`${CONFIG.SUPABASE_URL.replace(/\/$/, "")}/storage/v1/object/payment-shots/${path}`, {
      method: "POST",
      headers: {
        apikey: CONFIG.SUPABASE_ANON_KEY,
        Authorization: `Bearer ${CONFIG.SUPABASE_ANON_KEY}`,
        "Content-Type": file.type || "image/png",
      },
      body: file,
    });
    if (!res.ok) throw new Error("Screenshot upload failed — you can retry without it.");
    return path;
  }

  async function submitUTR(refCode) {
    const btn = $("#utr-submit");
    const label = $("#utr-submit-label");
    if (!btn || btn.classList.contains("submitting")) return;
    const utr = ($("#utr-input").value || "").replace(/\s+/g, "");
    if (!/^[A-Za-z0-9]{10,16}$/.test(utr)) {
      return showToast("<strong>Almost there</strong>The UPI transaction ID is 10–16 letters and digits — usually the 12-digit UTR shown under transaction details in your UPI app.", true);
    }
    if (!supabaseConfigured()) {
      return showToast(`<strong>Service not configured</strong>Write to ${CONFERENCE.email} with your reference code — the secretariat will verify your payment directly.`, true);
    }

    btn.classList.add("submitting");
    btn.disabled = true;
    label.textContent = "Checking the ledger…";
    setUtrStatus("Filing your UTR and screenshot to the verification desk…");
    try {
      let shotPath = null;
      try {
        shotPath = await uploadShot(refCode);
        if (!shotPath && CONFIG.UPI_QR.REQUIRE_PAYMENT_SHOT) {
          return setUtrStatus("<strong>One thing missing.</strong> Attach the UPI app's payment-success screenshot — it is the proof the secretariat verifies against. It goes to a private bucket only the secretariat can open.", "err");
        }
      } catch (e) {
        if (CONFIG.UPI_QR.REQUIRE_PAYMENT_SHOT) {
          return setUtrStatus(`${esc(e.message || "")}`, "err");
        }
        setUtrStatus(`${esc(e.message || "")}`, "err");
      }
      const out = await sb("rpc/submit_payment_utr", {
        method: "POST",
        body: JSON.stringify({
          p_ref_code: refCode,
          p_utr: utr,
          p_amount: payInvoice ? Number(payInvoice.amount) : Number(CONFIG.REGISTRATION_FEE),
          p_shot_path: shotPath,
        }),
      });
      if (out && out.status === "paid") {
        setUtrStatus("<strong>Verified — payment matched.</strong> Your fee is settled and the confirmation mail is on its way to your inbox.", "paid");
        $("#utr-input").disabled = true;
        btn.disabled = true;
        showToast("<strong>Payment verified</strong>Your payment was already confirmed — see you at the table.");
      } else {
        setUtrStatus(`<strong>Submitted — your payment is on the verification desk.</strong> The AI desk reads your screenshot right away; the secretariat confirms it against the bank statement and the confirmation mail follows. Keep your reference code <strong>${esc(refCode)}</strong>.`, "wait");
        showToast("<strong>UTR received</strong>You can close this page — the secretariat confirms against the bank statement.");
        if (shotPath) runShotCheck(refCode);   /* async polish — never blocks the flow */
      }
    } catch (err) {
      const msg = String(err.message || "");
      if (/could not find the function|pgrst202|schema cache/i.test(msg)) {
        setUtrStatus("<strong>The payment desk is still being set up.</strong> Quote your reference code in an email to the secretariat and they will verify your payment directly.", "wait");
      } else {
        setUtrStatus(`<strong>Could not submit.</strong> ${esc(msg || "Unexpected error — retry in a moment.")}`, "err");
      }
    } finally {
      btn.classList.remove("submitting");
      btn.disabled = false;
      label.textContent = "Verify my payment";
    }
  }

  /* re-entering the register view remounts the wizard at stage I */
  window.__regReset = () => show(0);

  /* ——— AI shot-check (Gemini 2.5 Flash, edge function) ———
     Reads the uploaded screenshot back, cross-checks what it shows
     against the declared UTR / amount / payee VPA, and answers with a
     consistency verdict. This is a convenience read — it NEVER flips
     the registration to paid; that stays with the bank feed or the
     secretariat. Not configured (no GEMINI_API_KEY) → silent skip. */
  async function runShotCheck(refCode) {
    const el = $("#utr-status");
    if (!el) return;
    let line = el.querySelector(".ai-line");
    if (!line) {
      line = document.createElement("div");
      el.appendChild(line);
    }
    line.className = "ai-line";
    line.textContent = "AI is reading your screenshot…";
    try {
      const res = await fetch(`${CONFIG.SUPABASE_URL.replace(/\/$/, "")}/functions/v1/check-payment-shot`, {
        method: "POST",
        headers: {
          apikey: CONFIG.SUPABASE_ANON_KEY,
          Authorization: `Bearer ${CONFIG.SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ref_code: refCode }),
      });
      if (!res.ok) { line.remove(); return; }          /* 503 not configured, 404, cap — silent */
      const out = await res.json();
      if (out.error || out.status === "paid" || !out.verdict) { line.remove(); return; }
      const v = out.verdict || {};
      const read = `${v.app ? v.app + " · " : ""}₹${v.amount ?? "?"}${v.payee_vpa ? " → " + v.payee_vpa : ""}${v.utr ? " · UTR " + v.utr : ""}`;
      if (v.consistency === "match") {
        line.innerHTML = `<strong>AI read your screenshot — all consistent ✓</strong> ${esc(read)}. ${esc(v.notes || "")} Final verification still happens the moment your bank credit lands.`;
        line.classList.add("is-ok");
      } else if (v.consistency === "mismatch") {
        line.innerHTML = `<strong>AI spotted a problem in your screenshot.</strong> ${esc((v.anomalies || []).join(" · ") || read)} ${esc(v.notes || "")} If the payment is wrong, pay the exact fee to the conference UPI ID and re-submit; if the screenshot is wrong, upload the correct one.`;
        line.classList.add("is-bad");
      } else {
        line.textContent = `AI couldn't fully read your screenshot — the secretariat will check it by hand. ${v.notes || ""}`;
        line.classList.add("is-meh");
      }
    } catch { line.remove(); }   /* AI polish must never break the flow */
  }

  /* ——— allocation matrix modal ——— */
  const overlay = $("#matrix-overlay");
  const body = $("#matrix-body");

  const listFor = (slug) => {
    const raw = ALLOCATION_MATRIX[slug] || [];
    const arr = Array.isArray(raw) ? raw : String(raw).split(",");
    return arr.map((s) => s.trim()).filter(Boolean);
  };

  function renderMatrix() {
    body.innerHTML = REG_OPTIONS.map((c) => {
      const list = listFor(c.slug);
      const right = list.length
        ? `<div class="matrix-chips">${list.map((p) => `<span class="matrix-chip">${p}</span>`).join("")}</div>`
        : `<span class="matrix-releasing">Releasing soon</span>`;
      return `<div class="matrix-row">
        <div class="matrix-acronym">${c.acronym}</div>
        <div><p class="matrix-row-name">${c.name}</p>${right}</div>
      </div>`;
    }).join("");
  }

  function openMatrix() {
    renderMatrix();
    overlay.hidden = false;
    document.body.style.overflow = "hidden";
  }
  function closeMatrix() {
    overlay.hidden = true;
    document.body.style.overflow = "";
  }

  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-matrix]")) openMatrix();
  });
  $("#matrix-close").addEventListener("click", closeMatrix);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeMatrix();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !overlay.hidden) closeMatrix();
  });

  /* ——— footer easter egg — invisible hitbox over "Eighth Edition" ——— */
  const eggOverlay = $("#egg-overlay");
  const eggConfetti = makeConfetti($("#egg-confetti"));

  /* badge number: dealt once, then stable per visitor — flex material for the post */
  let eggBadge;
  try {
    eggBadge = localStorage.getItem("somun-egg-badge");
    if (!eggBadge) {
      eggBadge = String(1 + ((Math.random() * 12) | 0)).padStart(2, "0");
      localStorage.setItem("somun-egg-badge", eggBadge);
    }
  } catch {
    eggBadge = String(1 + ((Math.random() * 12) | 0)).padStart(2, "0");
  }
  $("#egg-badge-no").textContent = `#${eggBadge}`;

  const openEgg = () => {
    eggOverlay.hidden = false;
    document.body.style.overflow = "hidden";
    eggConfetti.burst(0.5, 0.42, 150);
  };
  const closeEgg = () => {
    eggOverlay.hidden = true;
    document.body.style.overflow = "";
  };
  $("#egg-hit").addEventListener("click", openEgg);
  $("#egg-close").addEventListener("click", closeEgg);
  $("#egg-seal").addEventListener("click", closeEgg);
  eggOverlay.addEventListener("click", (e) => {
    if (e.target === eggOverlay) {
      closeEgg();
    } else if (!e.target.closest("#egg-close")) {
      /* party on every click — confetti pops from wherever you tap */
      eggConfetti.burst(e.clientX / window.innerWidth, e.clientY / window.innerHeight, 55);
    }
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !eggOverlay.hidden) closeEgg();
  });
}

/* ————— Payment status lookup — a delegate's ref code + email pair,
   nothing fishable. Visible only while the portal is open. ————— */

{
  const card = $("#status-card");
  const btn = $("#status-check");
  if (card && btn) {
    const res = $("#status-result");
    const show = (html, mood) => {
      res.hidden = !html;
      res.innerHTML = html || "";
      res.className = "status-result" + (mood ? ` is-${mood}` : "");
    };
    btn.addEventListener("click", async () => {
      const ref = ($("#status-ref").value || "").trim().toUpperCase();
      const email = ($("#status-email").value || "").trim().toLowerCase();
      if (!ref || !email) return show("Both the reference code and the email you registered with are needed.", "err");
      show("Checking the ledger…");
      try {
        const out = await sb("rpc/payment_status", {
          method: "POST",
          body: JSON.stringify({ p_ref_code: ref, p_email: email }),
        });
        if (out.status === "paid") {
          show(`<strong>Paid &amp; verified.</strong> The confirmation mail is on its way to your inbox${out.paid_at ? ` · verified ${whenIST(out.paid_at)}` : ""}.`, "paid");
        } else if (out.status === "failed") {
          show("<strong>Not verified.</strong> The secretariat could not match this payment — check the UTR you submitted or write in.", "err");
        } else {
          const amt = out.expected_amount != null ? ` ₹${Number(out.expected_amount).toFixed(2)}` : "";
          show(out.utr_set
            ? "<strong>Verifying.</strong> Your UTR and screenshot are in — the secretariat confirms against the bank statement and the confirmation mail fires the moment it does."
            : `<strong>Registered — fee pending.</strong> Settle the exact amount${amt} — your personal watermark amount — from your confirmation screen to lock your seat.`, "wait");
        }
      } catch (err) {
        const msg = String(err.message || "");
        show(/could not find the function|pgrst202|schema cache/i.test(msg)
          ? "The status desk isn't installed yet — run supabase/payment.sql."
          : esc(msg || "Lookup failed — retry in a moment."), "err");
      }
    });
  }
}

/* timestamps in the console + status line render in IST */
function whenIST(t) {
  try {
    return new Date(t).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return String(t || "");
  }
}

/* ————————————————— Verification console (#/verify — secretariat) —————
   The payment desk: pending UTRs, the live bank credit feed, manual
   verify / reject / bind and the mail queue. Gated by the console key
   held ONLY inside Supabase (app_secrets.admin_key) — every read and
   write flows through SECURITY DEFINER RPCs, so the public anon key can
   neither read rows nor call anything without the key. Polls every 20 s
   while the page is open. No nav link anywhere — shared by URL only. */

{
  const view = $('.view[data-view="verify"]');
  const gate = $("#pay-admin-gate");
  const body = $("#pay-admin-body");
  const keyInput = $("#pay-admin-key");
  const errEl = $("#pay-admin-err");
  let key = "";
  let pollTimer = 0;

  const rpc = (fn, args) => sb(`rpc/${fn}`, { method: "POST", body: JSON.stringify(args) });
  const fmtINR = (n) => {
    if (n == null || n === "") return "—";
    const v = Number(n);
    const paise = Math.round(v * 100) % 100 !== 0;
    return `₹ ${v.toLocaleString("en-IN", { minimumFractionDigits: paise ? 2 : 0, maximumFractionDigits: 2 })}`;
  };
  const shortPath = (p) => (p ? String(p).split("/").pop() : "");

  function renderOverview(o) {
    const s = o.stats || {};
    const aiBadge = (r) => {
      const v = r.shot_check && r.shot_check.verdict;
      if (!v) return "";
      if (v.consistency === "match") {
        return `<span class="pa-ai pa-ai--ok" title="${esc(v.notes || "AI read: consistent")}">AI ✓</span>`;
      }
      if (v.consistency === "mismatch") {
        return `<span class="pa-ai pa-ai--bad" title="${esc((v.anomalies || []).join(" · ") || v.notes || "AI read: mismatch")}">AI ⚠</span>`;
      }
      return `<span class="pa-ai pa-ai--meh" title="${esc(v.notes || "AI could not read the shot")}">AI ?</span>`;
    };
    $("#pay-admin-stats").innerHTML = [
      ["Awaiting UTR check", s.pending_utr || 0, s.pending_utr ? "hot" : ""],
      ["Registered · fee pending", s.pending_no_utr || 0, ""],
      ["Verified", s.paid || 0, "ok"],
      ["Rejected", s.failed || 0, s.failed ? "bad" : ""],
      ["Unmatched credits", s.unmatched || 0, s.unmatched ? "hot" : ""],
      ["Mails queued", s.mail_waiting || 0, s.mail_waiting ? "hot" : ""],
    ].map(([l, v, c]) => `<div class="pa-stat${c ? ` pa-stat--${c}` : ""}"><span class="pa-stat-v">${esc(v)}</span><span class="pa-stat-l">${esc(l)}</span></div>`).join("");

    /* the sales meter — invoiced vs confirmed, live from the rows */
    const t = o.totals || {};
    const sales = $("#pay-admin-sales");
    if (sales) {
      const awaiting = Math.max(0, (Number(t.invoiced) || 0) - (Number(t.confirmed) || 0));
      sales.innerHTML = [
        ["Invoiced", fmtINR(t.invoiced), `${t.live_count ?? 0} live registrations`, ""],
        ["Confirmed", fmtINR(t.confirmed), `${t.paid_count ?? 0} verified`, "ok"],
        ["Awaiting", fmtINR(awaiting), "not yet reconciled", awaiting > 0 ? "hot" : ""],
        ["AI-matched", String(t.ai_matched ?? 0), "pending rows read consistent", ""],
      ].map(([l, v, sub, c]) => `<div class="pa-stat${c ? ` pa-stat--${c}` : ""}"><span class="pa-stat-v">${esc(v)}</span><span class="pa-stat-l">${esc(l)}<em>${esc(sub)}</em></span></div>`).join("");
    }

    /* pending UTRs */
    const pend = $("#pay-admin-pending");
    const pending = o.pending || [];
    if (!pending.length) {
      pend.innerHTML = `<p class="pa-empty">No UTRs waiting — the feed verifies them on arrival.</p>`;
    } else {
      pend.innerHTML = pending.map((r) => `
        <div class="pa-row" data-id="${esc(r.id)}">
          <div class="pa-row-main">
            <p class="pa-row-title"><strong>${esc(r.full_name)}</strong><span class="pa-code">${esc(r.ref_code)}</span></p>
            <p class="pa-row-sub">${esc(r.email)} · ${esc(r.phone || "")}${r.institution ? " · " + esc(r.institution) : ""}</p>
            <p class="pa-row-meta">invoice <strong>${fmtINR(r.expected_amount)}</strong>${r.amount != null ? ` · declared ${fmtINR(r.amount)}` : ""} · UTR <span class="pa-mono">${esc(r.upi_utr || "")}</span> · submitted ${whenIST(r.utr_submitted_at)}${r.status_note ? ` · <em>${esc(r.status_note)}</em>` : ""}${r.shot_path ? ` · shot <span class="pa-mono" title="${esc(r.shot_path)}">${esc(shortPath(r.shot_path))}</span> (view in Dashboard → Storage → payment-shots)` : ""}${aiBadge(r)}</p>
          </div>
          <div class="pa-row-actions">
            <button class="pa-btn pa-btn--ok" data-act="paid" data-id="${esc(r.id)}">Verify</button>
            <button class="pa-btn pa-btn--bad" data-act="failed" data-id="${esc(r.id)}">Reject</button>
          </div>
        </div>`).join("");
    }

    /* credit feed */
    const allPend = pending.map((r) => ({ id: r.id, label: `${r.ref_code} — ${r.full_name}` }))
      .concat((o.no_utr || []).map((r) => ({ id: r.id, label: `${r.ref_code} — ${r.full_name}` })));
    const opts = allPend.map((p) => `<option value="${esc(p.id)}">${esc(p.label)}</option>`).join("");
    const crel = $("#pay-admin-credits");
    const credits = o.credits || [];
    if (!credits.length) {
      crel.innerHTML = `<p class="pa-empty">The feed is quiet — credits land here from the forwarder, or paste one in below.</p>`;
    } else {
      crel.innerHTML = credits.map((c) => `
        <div class="pa-row pa-row--credit${c.consumed_by ? " is-consumed" : ""}${c.ignored ? " is-ignored" : ""}" data-id="${esc(c.id)}">
          <div class="pa-row-main">
            <p class="pa-row-meta">${whenIST(c.recv_at)} · ${esc((c.src || "sms").toUpperCase())}${c.sender ? " · " + esc(c.sender) : ""}</p>
            <p class="pa-row-body">${esc(c.body || "")}</p>
            <p class="pa-row-meta">amount <strong>${fmtINR(c.amount_inr)}</strong>${c.utr ? ` · UTR <span class="pa-mono">${esc(c.utr)}</span>` : " · <em>no UTR in text</em>"}${c.consumed_by ? ` · <span class="pa-ok">consumed</span>` : c.ignored ? ` · ignored` : ` · <span class="pa-hot">unmatched</span>`}</p>
          </div>
          ${c.consumed_by || c.ignored ? `
          <div class="pa-row-actions">
            ${c.consumed_by ? `<button class="pa-btn" data-act="restore" data-id="${esc(c.id)}">Unbind</button>` : `<button class="pa-btn" data-act="restore" data-id="${esc(c.id)}">Restore</button>`}
          </div>` : `
          <div class="pa-row-actions">
            <select class="pa-select" aria-label="Bind this credit to a registration">${opts ? `<option value="">Bind to…</option>${opts}` : `<option value="">No pending rows</option>`}</select>
            <button class="pa-btn pa-btn--ok" data-act="bind" data-id="${esc(c.id)}">Bind</button>
            <button class="pa-btn" data-act="ignore" data-id="${esc(c.id)}">Ignore</button>
          </div>`}
        </div>`).join("");
    }

    /* mail queue */
    const mail = $("#pay-admin-mail");
    const mails = o.mail || [];
    mail.innerHTML = mails.length
      ? mails.map((m) => `
        <div class="pa-row" data-id="${esc(m.registration_id || "")}">
          <div class="pa-row-main">
            <p class="pa-row-title"><strong>${esc(m.full_name || m.to_email)}</strong>${m.ref_code ? `<span class="pa-code">${esc(m.ref_code)}</span>` : ""}</p>
            <p class="pa-row-meta">queued ${whenIST(m.created_at)} → ${esc(m.to_email)}</p>
          </div>
          <div class="pa-row-actions">
            ${m.registration_id ? `<button class="pa-btn" data-act="requeue" data-id="${esc(m.registration_id)}">Requeue</button>` : ""}
          </div>
        </div>`).join("")
      : `<p class="pa-empty">Nothing queued — mails fire the moment a payment verifies.</p>`;

    /* recently verified */
    const paid = $("#pay-admin-paid");
    const paidRows = o.paid_recent || [];
    paid.innerHTML = paidRows.length
      ? paidRows.map((r) => `
        <div class="pa-row" data-id="${esc(r.id)}">
          <div class="pa-row-main">
            <p class="pa-row-title"><strong>${esc(r.full_name)}</strong><span class="pa-code">${esc(r.ref_code)}</span></p>
            <p class="pa-row-meta">verified ${whenIST(r.paid_at)} · ${fmtINR(r.amount)}${r.upi_utr ? ` · UTR <span class="pa-mono">${esc(r.upi_utr)}</span>` : " · manual"}</p>
          </div>
          <div class="pa-row-actions">
            <button class="pa-btn" data-act="pending" data-id="${esc(r.id)}" title="Revert to pending — mail queue is cleared">Revert</button>
            <button class="pa-btn" data-act="requeue" data-id="${esc(r.id)}">Requeue mail</button>
          </div>
        </div>`).join("")
      : `<p class="pa-empty">No verified payments yet.</p>`;
  }

  async function load() {
    const out = await rpc("pay_admin_overview", { p_key: key });
    renderOverview(out || {});
  }

  function setErr(msg) {
    errEl.hidden = !msg;
    errEl.textContent = msg || "";
  }

  async function openWith(k) {
    const out = await rpc("pay_admin_overview", { p_key: k });
    key = k;
    try { sessionStorage.setItem("somun-pay-key", k); } catch { /* private mode */ }
    gate.hidden = true;
    body.hidden = false;
    renderOverview(out || {});
    if (!pollTimer) {
      pollTimer = setInterval(() => {
        if (document.hidden || !view.classList.contains("active") || !key) return;
        load().catch(() => { /* transient — next poll retries */ });
      }, 20000);
    }
  }

  async function unlock() {
    setErr("");
    const k = keyInput.value.trim();
    if (k.length < 8) return setErr("That key is too short.");
    try {
      await openWith(k);
    } catch (err) {
      const msg = String(err.message || "");
      setErr(/could not find the function|pgrst202|schema cache/i.test(msg)
        ? "The console isn't installed on the database yet — run supabase/payment.sql in the SQL Editor first."
        : msg || "Wrong key.");
    }
  }

  $("#pay-admin-enter").addEventListener("click", unlock);
  keyInput.addEventListener("keydown", (e) => { if (e.key === "Enter") unlock(); });

  body.addEventListener("click", async (e) => {
    const b = e.target.closest("[data-act]");
    if (!b) return;
    const act = b.dataset.act;
    const id = b.dataset.id;
    try {
      if (act === "paid" || act === "failed" || act === "pending") {
        const note = act === "failed" ? (window.prompt("Rejection reason (stored on the row):") || "rejected by secretariat") : null;
        await rpc("pay_admin_decide", { p_key: key, p_registration: id, p_action: act, p_note: note });
        showToast(act === "paid" ? "<strong>Verified</strong>The confirmation mail is queued." : "<strong>Done</strong>The row is updated.");
      } else if (act === "ignore") {
        await rpc("pay_admin_ignore", { p_key: key, p_credit: id, p_ignore: true });
      } else if (act === "restore") {
        await rpc("pay_admin_ignore", { p_key: key, p_credit: id, p_ignore: false });
      } else if (act === "bind") {
        const sel = b.closest(".pa-row-actions").querySelector("select");
        if (!sel || !sel.value) return showToast("Pick the delegate this credit belongs to first.", true);
        await rpc("pay_admin_bind", { p_key: key, p_credit: id, p_registration: sel.value });
        showToast("<strong>Bound</strong>The credit now verifies that registration — mail queued.");
      } else if (act === "requeue") {
        await rpc("pay_admin_requeue", { p_key: key, p_registration: id });
        showToast("<strong>Requeued</strong>The mail webhook fires again for this delegate.");
      } else if (act === "ingest") {
        const t = $("#pay-admin-sms");
        if (!t || !t.value.trim()) return;
        await rpc("ingest_credit", { p_key: key, p_body: t.value.trim(), p_src: "manual" });
        t.value = "";
        showToast("<strong>Ingested</strong>Parsed and matched — see the feed below.");
      }
      await load();
    } catch (err) {
      showToast(`<strong>Failed</strong>${esc(err.message || "Retry in a moment.")}`, true);
    }
  });

  /* entering the view re-checks the session key lazily */
  window.__verifyEnter = async () => {
    if (key) return;
    let saved = null;
    try { saved = sessionStorage.getItem("somun-pay-key"); } catch { /* private mode */ }
    if (!saved) return;
    try {
      await openWith(saved);
    } catch {
      try { sessionStorage.removeItem("somun-pay-key"); } catch { /* ignore */ }
    }
  };
}

/* ————————————————— Boot ————————————————— */

hydrateIcons();
window.__observeReveals();
showView(currentView, { animate: false });

/* ————— Countdown focus mode (desktop) — apple spotlight —————
   hover the readout and the whole page drops behind a frosted veil
   while the timer detaches as a fixed ghost clone that springs up 2x,
   floating above the blur — the only thing in focus. Numbers keep
   ticking into the ghost; leaving (or scroll / Escape) settles it back.
   Stability contract: the ghost's spring is CONTAINED — its lift never
   exceeds its scale growth, so the box only ever grows around the parked
   cursor and can never drift out from under the mouse (the r24 churn:
   a 48px lift on a 36px readout floated the ghost off the cursor, killed
   it, respawned it, forever). Exit is a soft ring (26px past the box)
   with a 140ms dwell, so edge jitter can't toggle the mode; re-entry
   mid-fade revives instead of fighting; re-arm rides the move stream
   because chromium skips boundary events after mid-hover spawns.
   Mobile + reduced-motion never bind. */
{
  const cd = $("#countdown");
  const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (cd && finePointer && !reduceMotion) {
    let ghost = null;
    let veil = null;
    let sync = null;
    let leaving = false;
    let killTimer = 0;
    let retryTimer = 0;
    let firstOutsideAt = 0;
    let coolUntil = 0;
    let lastX = -1;
    let lastY = -1;
    let watch = 0;
    const OUTSET = 26;   /* soft exit ring — px beyond the ghost box */
    const DWELL = 140;   /* ms the pointer must stay outside before settle */

    const teardown = () => {
      if (retryTimer) { clearTimeout(retryTimer); retryTimer = 0; }
      if (watch) { clearInterval(watch); watch = 0; }
      if (ghost) ghost.remove();
      if (veil) veil.remove();
      if (sync) clearInterval(sync);
      ghost = veil = null;
      sync = null;
      leaving = false;
      firstOutsideAt = 0;
      cd.style.visibility = "";
      window.removeEventListener("wheel", onWheel);
      document.removeEventListener("mousemove", onMove);
      coolUntil = performance.now() + 300;  /* brief chill — no churn */
    };

    const settleBack = () => {
      if (!ghost || leaving) return;
      leaving = true;
      firstOutsideAt = 0;
      ghost.classList.remove("is-on");
      veil.classList.remove("is-on");
      killTimer = setTimeout(teardown, 380);
    };

    const revive = () => {
      /* pointer came back during the fade — return to full focus */
      if (!ghost || !leaving) return;
      clearTimeout(killTimer);
      leaving = false;
      firstOutsideAt = 0;
      ghost.classList.add("is-on");
      veil.classList.add("is-on");
    };

    const onWheel = () => {
      coolUntil = performance.now() + 650;  /* scroll = deliberate leave */
      settleBack();
    };

    const outsideRing = (x, y) => {
      if (!ghost) return false;
      const r = ghost.getBoundingClientRect();
      return x < r.left - OUTSET || x > r.right + OUTSET ||
             y < r.top - OUTSET || y > r.bottom + OUTSET;
    };

    /* the move stream only records the pointer; exit is judged on a poll
       so a cursor whose LAST move landed outside the ring settles even if
       it never moves again (movement-gated dwell was the lingering ghost) */
    const onMove = (e) => { lastX = e.clientX; lastY = e.clientY; };

    const poll = () => {
      if (!ghost || leaving || lastX < 0) return;
      if (outsideRing(lastX, lastY)) {
        if (!firstOutsideAt) firstOutsideAt = performance.now();
        else if (performance.now() - firstOutsideAt > DWELL) settleBack();
      } else {
        firstOutsideAt = 0;
      }
    };

    /* re-arm from the move stream: a parked cursor over the readout with
       no ghost alive always re-focuses, whatever killed the last one */
    const arm = () => {
      if (ghost || performance.now() < coolUntil) return;
      if (cd.matches(":hover")) focusIn();
    };

    const focusIn = () => {
      if (performance.now() < coolUntil) {
        /* entered during the post-teardown chill — retry once it lifts,
           so a cursor that lands and stays still is never left unfocused */
        clearTimeout(retryTimer);
        retryTimer = setTimeout(() => {
          retryTimer = 0;
          if (!ghost && cd.matches(":hover")) focusIn();
        }, coolUntil - performance.now() + 40);
        return;
      }
      if (ghost) {
        if (!leaving) return;
        clearTimeout(killTimer);
        teardown();  /* re-entered mid fade-out — start clean */
      }
      const r = cd.getBoundingClientRect();

      veil = document.createElement("div");
      veil.className = "cd-veil";
      veil.setAttribute("aria-hidden", "true");

      ghost = cd.cloneNode(true);
      ghost.removeAttribute("id");
      ghost.setAttribute("aria-hidden", "true");
      ghost.classList.add("cd-ghost");
      ghost.querySelectorAll("[id]").forEach((n) => n.removeAttribute("id"));
      ghost.style.left = `${r.left}px`;
      ghost.style.top = `${r.top}px`;
      ghost.style.width = `${r.width}px`;
      ghost.style.height = `${r.height}px`;
      ghost.addEventListener("mouseleave", () => {
        if (!firstOutsideAt) firstOutsideAt = performance.now();
      });
      ghost.addEventListener("mouseenter", () => {
        firstOutsideAt = 0;
        revive();
      });

      cd.style.visibility = "hidden";
      document.body.append(veil, ghost);
      requestAnimationFrame(() => {
        veil.classList.add("is-on");
        ghost.classList.add("is-on");
      });

      /* the real readout keeps ticking (visibility hidden) — mirror it */
      const src = cd.querySelectorAll(".countdown-num");
      const dst = ghost.querySelectorAll(".countdown-num");
      sync = setInterval(() => {
        src.forEach((n, i) => { if (dst[i]) dst[i].textContent = n.textContent; });
      }, 200);

      window.addEventListener("wheel", onWheel, { passive: true });
      document.addEventListener("mousemove", onMove, { passive: true });
      watch = setInterval(poll, 90);
    };

    cd.addEventListener("mouseenter", focusIn);
    document.addEventListener("mousemove", arm, { passive: true });
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") settleBack();
    });
  }
}
