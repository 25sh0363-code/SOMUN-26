/* ————————————————————————————————————————————————————————————————
   SOMUN '26 — SITE BEHAVIOUR
   Vanilla JS. No frameworks, no build step.
   Sections: helpers · content render · router · gate · countdown ·
   reveal-on-scroll · committees deck · register form (Supabase) ·
   resources (Supabase) · itinerary
   ———————————————————————————————————————————————————————— */

import { CONFERENCE, COMMITTEES, FEES, ITINERARY, SHOW_ITINERARY } from "./data.js";
import { CONFIG, supabaseConfigured } from "./config.js";
import { icon, hydrateIcons } from "./icons.js";

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const pad2 = (n) => String(n).padStart(2, "0");
const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

/* stagger delays for the dossier entrance choreography (0.08 + i·0.085s) */
const stag = (i) => `transition-delay:${(0.08 + i * 0.085).toFixed(3)}s`;

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

$('[data-copy="tagline"]').textContent = CONFERENCE.tagline;
$('[data-copy="dates"]').textContent = CONFERENCE.dates;
$('[data-copy="venue"]').textContent = `${CONFERENCE.venue} · ${CONFERENCE.city}`;
$("#itin-intro").textContent =
  `From the first roll call to the final gavel — the full three-day programme at ${CONFERENCE.venue} will be published right here, day by day.`;
$("#reg-intro").textContent =
  `Complete the form below and the secretariat will respond with your portfolio allotment and payment link. Early-bird rates apply until September 30, 2026 — for assistance write to ${CONFERENCE.email}.`;
$("#year").textContent = new Date().getFullYear();

/* ————————————————— Ticker ————————————————— */

{
  const words = ["DIPLOMACY", "DEBATE", "NEGOTIATION", "RESOLUTION", "CAUCUS", "CONSENSUS"];
  const row = words.map(
    (w) => `<span class="ticker-word">${w}</span><span class="ticker-diamond"></span>`
  ).join("");
  $$("[data-ticker]").forEach((el) => (el.innerHTML = row + row));
}

/* ————————————————— Pillars ————————————————— */

{
  const PILLARS = [
    { ic: "gavel", title: "Rigorous Debate", body: "Agendas chosen to bite — autonomous weapons, electoral reform, pandemic treaties. No soft topics, no free passes." },
    { ic: "globe-2", title: "Global Perspective", body: "Committees span six continents' worth of crises. Delegates argue positions they did not choose — and understand better for it." },
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
      <button class="preview-card" data-nav="committees" aria-label="Explore ${c.acronym}">
        <div class="preview-top">
          <span class="preview-acronym">${c.acronym}</span>
          <span class="preview-diff">${c.difficulty}</span>
        </div>
        <p class="preview-name">${c.name}</p>
        <p class="preview-desc">${c.description}</p>
        <p class="preview-foot">${c.delegates} seats · ${c.agendas.length} agendas →</p>
      </button>
    </div>`).join("");
}

/* ————————————————— Committees deck slides ————————————————— */

{
  const track = $("#deck-track");
  track.innerHTML = COMMITTEES.map((c, i) => {
    const roman = ROMAN[i];
    const plateInner = c.photo
      ? `<img class="plate-art" src="${c.photo}" alt="${c.acronym} — ${c.name}" loading="${i <= 1 ? "eager" : "lazy"}" />
         <div class="plate-shade"></div>
         <div class="plate-tint"></div>`
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
                <p class="plate-credit">Official chamber dossier · artwork to follow</p>
                <span class="plate-num">${pad2(i + 1)}</span>
              </div>
            </div>

            <div class="dossier-body">
              <div class="dossier-content">
                <div class="dossier-top stagger-item" style="${stag(1)}">
                  <p class="dossier-no">Dossier Nº ${roman}</p>
                  <span class="diff-chip diff-chip--${c.difficulty}">${c.difficulty}</span>
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
                    <span class="delegations"><i data-icon="users"></i>${c.delegates} delegations</span>
                    <button class="take-seat" data-nav="register" aria-label="Register for ${c.acronym}">
                      <span class="take-seat-fill"></span>
                      <span class="take-seat-label">Take the seat <i data-icon="arrow-right"></i></span>
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

/* ————————————————— Secretariat seats + USG corps ————————————————— */

{
  const seatCard = (i) => `
    <div class="reveal" data-delay="${(i * 0.05).toFixed(2)}">
      <div class="seat-card">
        <span class="seat-watermark" aria-hidden="true">${ROMAN[i]}</span>
        <span class="seat-lock"><i data-icon="lock"></i></span>
        <p class="seat-kicker">Seat ${ROMAN[i]}</p>
        <h3 class="seat-title">To be announced</h3>
        <p class="seat-sub">Revealed with the first secretariat release.</p>
      </div>
    </div>`;
  $("#core-seats").innerHTML = Array.from({ length: 7 }, (_, i) => seatCard(i)).join("");

  $("#usg-grid").innerHTML = Array.from({ length: 6 }, (_, i) => `
    <div class="reveal" data-delay="${(i * 0.05).toFixed(2)}">
      <div class="seat-card">
        <div class="usg-top">
          <span class="seat-lock"><i data-icon="lock"></i></span>
          <span class="usg-num" aria-hidden="true">${pad2(i + 1)}</span>
        </div>
        <p class="usg-kicker">Under-Secretary-General</p>
        <h3 class="seat-title">Portfolio to be announced</h3>
        <p class="seat-sub">Delegation affairs, procedure, press, logistics and more.</p>
      </div>
    </div>`).join("");
}

/* ————————————————— Resources archive cards + guides index ————————————————— */

const RES_META = [
  { ic: "book-open", no: "01", title: "Study Guides", cat: "study-guides", desc: "Committee-wise background guides and agenda briefs in depth — everything you need before the first roll call." },
  { ic: "scroll-text", no: "02", title: "Rules of Procedure", cat: "rules", desc: "The SOMUN rules of procedure — motions, precedence and draft-resolution mechanics, the fine print of every chamber." },
  { ic: "file-text", no: "03", title: "Position Paper Brief", cat: "brief", desc: "Format, deadlines and assessment criteria for position papers across all nine committees." },
  { ic: "book-marked", no: "04", title: "Delegate Handbook", cat: "handbook", desc: "Venue maps, dress code, kit details and conference etiquette — your pocket companion for the three days." },
];

/* released[key] = { url, label } filled from Supabase (or left empty) */
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
}

function renderGuidesIndex(guides) {
  $("#guides-list").innerHTML = COMMITTEES.map((c) => {
    const url = guides[c.acronym];
    const status = url
      ? `<a class="guide-dl" href="${url}" target="_blank" rel="noopener">Download guide ↓</a>`
      : `<span class="guide-status"><span class="guide-diamond"></span>releasing soon</span>`;
    return `<li class="guide-row"><span class="guide-acronym">${c.acronym}</span>${status}</li>`;
  }).join("");
}

renderResourceCards();
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
      const any = (rows || []).length > 0;
      if (any) $("#guides-stamp")?.remove();
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
    COMMITTEES.map((c) => `<option value="${c.slug}">${c.acronym} — ${c.name}</option>`).join("");
});

/* ————————————————— Router ————————————————— */

const VIEWS = ["home", "committees", "secretariat", "itinerary", "resources", "register"];
const HASHES = {
  home: "#/",
  committees: "#/committees",
  secretariat: "#/secretariat",
  itinerary: "#/itinerary",
  resources: "#/resources",
  register: "#/register",
};

function viewFromHash() {
  const h = window.location.hash.replace(/^#\/?/, "").split("?")[0];
  return VIEWS.includes(h) ? h : "home";
}

let currentView = viewFromHash();

function setActiveNav(view) {
  $$(".nav-link, .drawer-link").forEach((el) => {
    el.classList.toggle("active", el.dataset.nav === view);
  });
}

function showView(view, { animate = true } = {}) {
  const target = $(`.view[data-view="${view}"]`);
  if (!target) return;
  $$(".view").forEach((v) => v.classList.remove("active", "view-enter"));
  target.classList.add("active");
  if (animate) {
    target.classList.remove("view-enter");
    void target.offsetWidth; // restart the entrance animation
    target.classList.add("view-enter");
  }
  setActiveNav(view);
  requestAnimationFrame(() => window.scrollTo({ top: 0 }));
  if (view === "committees") deckOnShow();
}

function transitionTo(view) {
  if (view === currentView) {
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
  /* re-anchor when the view becomes visible (widths are measurable only now) */
  deck.pos = deck.target = deck.active * slideWidth();
  deck.vel = 0;
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
  deck.el.style.height = `${Math.max(280, deck.n * 78)}vh`;
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

/* ————————————————— Register form (Supabase) ————————————————— */

{
  const form = $("#reg-form");
  const submitBtn = $("#reg-submit");
  const label = $("#reg-submit-label");
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function makeRefCode() {
    const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return `SM26-${code}`;
  }

  /* accommodation switch */
  const sw = $("#accommodation");
  sw.addEventListener("click", () => {
    const on = sw.getAttribute("aria-checked") !== "true";
    sw.setAttribute("aria-checked", String(on));
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
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
      accommodation: sw.getAttribute("aria-checked") === "true",
      notes: val("notes"),
    };

    /* same validation rules as the original API route */
    if (payload.fullName.length < 3) return showToast("<strong>Could not submit</strong>Please enter your full name.", true);
    if (!EMAIL_RE.test(payload.email)) return showToast("<strong>Could not submit</strong>Please enter a valid email address.", true);
    if (payload.phone.replace(/\D/g, "").length < 8) return showToast("<strong>Could not submit</strong>Please enter a valid phone number.", true);
    if (!payload.institution) return showToast("<strong>Could not submit</strong>Institution / organisation is required.", true);
    if (!payload.committeePref1) return showToast("<strong>Could not submit</strong>Please choose at least one committee preference.", true);

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
      accommodation: payload.accommodation,
      notes: payload.notes || null,
    };

    try {
      const inserted = await sb(CONFIG.REGISTRATIONS_TABLE, {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify(row),
      });
      const code = (Array.isArray(inserted) && inserted[0] && inserted[0].ref_code) || refCode;
      $("#refcode").textContent = code;
      $("#reg-form-wrap").hidden = true;
      $("#reg-success").hidden = false;
      showToast(`<strong>Registration received</strong>Your reference code is ${code}.`);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      showToast(`<strong>Could not submit</strong>${err.message || "Unexpected error. Please retry."}`, true);
    } finally {
      submitBtn.classList.remove("submitting");
      submitBtn.disabled = false;
      label.textContent = "Submit Application";
    }
  });
}

/* ————————————————— Boot ————————————————— */

hydrateIcons();
window.__observeReveals();
showView(currentView, { animate: false });
