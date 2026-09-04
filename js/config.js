/* ————————————————————————————————————————————————————————————————
   SOMUN '26 — SITE CONFIGURATION (Supabase + Cashfree)
   ————————————————————————————————————————————————————————
   The registration form and the resource downloads talk to Supabase.
   Payments (stage III → success box) go through Cashfree, driven by
   Supabase Edge Functions so the secret key never touches the browser.

   SUPABASE — LIVE (keys wired in):
   1. Run supabase/schema.sql ONCE in the Supabase SQL Editor — it
      creates the `registrations` + `resources` tables, row-security
      rules and the public storage bucket. (Anon keys can't create
      tables, so this one step is manual.)
   2. Registrations then appear in Table Editor → registrations, and
      rows marked released = true in `resources` become live download
      links automatically.
   3. Flip REGISTRATIONS_OPEN below when the portal should open.
   NOTE: the anon key is safe to publish — row security only allows
   inserting registrations and reading released resources.

   CASHFREE — KEYS BLANK UNTIL HANDOVER:
   Paste the app id below when received. The SECRET KEY is a reminder
   slot only — it must be installed server-side on the edge functions:
        supabase secrets set CASHFREE_APP_ID=… CASHFREE_SECRET_KEY=…
   While CASHFREE_APP_ID is empty (or REGISTRATION_FEE is 0) every
   payment surface on the site stays dormant: stage III keeps the
   "to be disclosed" panel and the success box hides its pay button.
   ———————————————————————————————————————————————————————— */

export const CONFIG = {
  /* Registration portal gate — flip to true when registrations open.
     While false: the register page stays browsable, but the wizard box
     is blurred + inert under an "Opening Soon" stamp. */
  REGISTRATIONS_OPEN: false,

  /* Committees reveal gate — flip to true on reveal day.
     While false: the committees deck and every committee dossier page stay
     in place but blurred + inert under a "Coming Soon" stamp — the same
     overlay treatment as the register wizard box. The full deck is
     untouched — flipping the flag restores everything as-is. */
  COMMITTEES_REVEALED: true,

  /* Meet the Secretariat — About page, chapter V.
     While SECRETARIAT_REVEALED is false: the section renders in place but
     blurred + inert under a "Coming Soon" stamp (same treatment as the
     committees deck) — and the Instagram embed is NOT loaded, nothing leaks.
     Flip to true on drop day: the blur lifts, the stamp disappears and the
     post embeds right on the page, with a "View on Instagram" button.
     SECRETARIAT_POST_URL: the Instagram post (or reel) link to embed —
     swap the link here any time, no other file needs touching. */
  SECRETARIAT_REVEALED: true,
  SECRETARIAT_POST_URL: "https://www.instagram.com/p/Dci_Fgsv1F2/",

  SUPABASE_URL: "https://gvhlbnyxysfhfwrflxsg.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2aGxibnl4eXNmaGZ3cmZseHNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc5Mzk5NjYsImV4cCI6MjEwMzUxNTk2Nn0.TzUqbSWhJTF1gx2tEjMdHkFwk_63VDhpHw46CHX5Reo",
  REGISTRATIONS_TABLE: "registrations",
  RESOURCES_TABLE: "resources",
  STORAGE_BUCKET: "resources", // public bucket for background guides etc.

  /* ——— Cashfree payments (blank until keys are handed over) ———
     CASHFREE_APP_ID   → pasted here when received (public identifier).
     CASHFREE_SECRET_KEY → reminder slot ONLY. It is installed server-side
       (`supabase secrets set CASHFREE_SECRET_KEY=…`) and read by the
       create-payment / verify-payment edge functions. Never shipped to
       the browser — the frontend never reads this field.
     CASHFREE_MODE     → "sandbox" while testing, "production" on go-live.
     REGISTRATION_FEE  → fee in rupees per delegate/IP pass. 0 = not
       announced yet (stage III shows "to be disclosed", pay box hidden). */
  CASHFREE_APP_ID: "",
  CASHFREE_SECRET_KEY: "",
  CASHFREE_MODE: "sandbox",
  REGISTRATION_FEE: 0,
};

/* Quick checks used across the site */
export function supabaseConfigured() {
  return Boolean(CONFIG.SUPABASE_URL && CONFIG.SUPABASE_ANON_KEY);
}

/* payments go live only when BOTH the app id and the fee are set */
export function cashfreeEnabled() {
  return Boolean(
    supabaseConfigured() &&
    CONFIG.CASHFREE_APP_ID &&
    CONFIG.CASHFREE_MODE &&
    Number(CONFIG.REGISTRATION_FEE) > 0
  );
}

/* fee announced but checkout not wired yet → show the amount, no button */
export function feeAnnounced() {
  return Number(CONFIG.REGISTRATION_FEE) > 0;
}

const inrFmt = new Intl.NumberFormat("en-IN");
export function formatINR(n) {
  return `₹ ${inrFmt.format(Math.round(Number(n)))}`;
}
