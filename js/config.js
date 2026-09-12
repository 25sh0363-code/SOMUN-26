/* ————————————————————————————————————————————————————————————————
   SOMUN '26 — SITE CONFIGURATION (Supabase + payments)
   ————————————————————————————————————————————————————————
   The registration form and the resource downloads talk to Supabase.

   PAYMENTS — no gateway (no PAN/KYC). Every registration is invoiced
   the base fee + a UNIQUE paise suffix (early bird ₹2799 → ₹2799.63 for
   one delegate, ₹2799.07 for the next) — the paise are the payment's
   identity. The delegate pays that exact amount (app deep link / QR),
   submits the UTR + success screenshot, and the secretariat reconciles
   the bank statement in #/verify — see supabase/PAYMENTS.md.
   The payee UPI ID lives in Supabase (app_secrets → payee_vpa) — the
   registration RPC returns it with every invoice. Nothing payment-
   related is configured in this file.

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
   ———————————————————————————————————————————————————————— */

export const CONFIG = {
  /* Registration portal gate — flip to true when registrations open.
     While false: the register page stays browsable, but the wizard box
     is blurred + inert under an "Opening Soon" stamp. */
  REGISTRATIONS_OPEN: false,
  TESTER_PIN: "somun26",

  /* Committees reveal gate — flip to true on reveal day.
     While false: the committees deck, the home four-card preview and every
     committee dossier page stay in place but blurred + inert under a
     "Coming Soon" stamp — the same overlay treatment as the register wizard
     box. The full deck is untouched — flipping the flag restores everything
     as-is. */
  COMMITTEES_REVEALED: true,

  /* Venue reveal gate — flip to true on venue-drop day.
     While false: every mention of the grounds (home strip, dossier, the
     timeline, the footer) renders in place but blur-redacted, and the live
     map exhibit in About · chapter VII never arms — the Google embed isn't
     even fetched, coordinates, address and the deep-link sit under a
     "Coming Soon" seal. Flipping the flag lifts the blur and arms the map,
     nothing else to change. */
  VENUE_REVEALED: true,

  /* Meet the Secretariat — About page, chapter V.
     While SECRETARIAT_REVEALED is false: the section renders in place but
     blurred + inert under a "Coming Soon" stamp (same treatment as the
     committees deck) — and the Instagram embed is NOT loaded, nothing leaks.
     Flip to true on drop day: the blur lifts, the stamp disappears and the
     post embeds right on the page, with a "View on Instagram" button.
     SECRETARIAT_POST_URL: the Instagram post (or reel) link to embed —
     swap the link here any time, no other file needs touching. */
  SECRETARIAT_REVEALED: false,
  SECRETARIAT_POST_URL: "https://www.instagram.com/p/Dci_Fgsv1F2/",

  SUPABASE_URL: "https://gvhlbnyxysfhfwrflxsg.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2aGxibnl4eXNmaGZ3cmZseHNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc5Mzk5NjYsImV4cCI6MjEwMzUxNTk2Nn0.TzUqbSWhJTF1gx2tEjMdHkFwk_63VDhpHw46CHX5Reo",
  REGISTRATIONS_TABLE: "registrations",
  RESOURCES_TABLE: "resources",
  STORAGE_BUCKET: "resources", // public bucket for background guides etc.

  /* Fee the browser announces (stage III shows it once > 0 — while 0
     every payment surface stays dormant under "to be disclosed"). The
     INVOICED amount itself is stamped per delegate server-side from
     app_secrets → fee_base_early (supabase/payment.sql) — keep the two
     in step when the early-bird window ends. */
  REGISTRATION_FEE: 2799,   /* early-bird base — round one TBD */

  /* ——— UPI watermark payments (the live path — no gateway, no KYC) ———
     The payee UPI ID is NOT set here — it lives in Supabase:
       app_secrets → payee_vpa   (Table Editor → app_secrets, edit the cell)
     The register_delegate RPC returns it with every invoice and the
     confirmation screen builds the per-delegate QR from it — the UPI ID
     can be swapped any time without touching this repo.
     Verification keys do NOT live in this file either — they are set
     inside Supabase (app_secrets table, see supabase/PAYMENTS.md):
       admin_key  → unlocks the secretariat console at #/verify */
  UPI_QR: {
    /* REQUIRE_PAYMENT_SHOT → delegates MUST attach the UPI success
       screenshot (private payment-shots bucket). The watermark scheme
       runs on screenshots — keep true. */
    REQUIRE_PAYMENT_SHOT: true,
  },
};

/* Quick checks used across the site */
export function supabaseConfigured() {
  return Boolean(CONFIG.SUPABASE_URL && CONFIG.SUPABASE_ANON_KEY);
}

/* fee announced but checkout not wired yet → show the amount, no button */
export function feeAnnounced() {
  return Number(CONFIG.REGISTRATION_FEE) > 0;
}

/* which payment flow the site should run right now:
   "qr" → UPI watermark QR + secretariat verification · "none" */
export function payFlow() {
  return feeAnnounced() ? "qr" : "none";
}

const inrFmt = new Intl.NumberFormat("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
export function formatINR(n) {
  const v = Math.round(Number(n) * 100) / 100;   /* keep the paise — they are the watermark */
  return `₹ ${inrFmt.format(v)}`;
}
