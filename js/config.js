/* ————————————————————————————————————————————————————————————————
   SOMUN '26 — SITE CONFIGURATION (Supabase)
   ————————————————————————————————————————————————————————
   The registration form and the resource downloads talk to Supabase.

   HOW TO CONNECT (5 minutes, free):
   1. Create a project at https://supabase.com (free tier is enough).
   2. Open the SQL Editor and run the setup SQL (a copy is kept in
      download/supabase-setup.sql — creates the tables + security rules).
   3. In Project Settings → API copy two values into the quotes below:
        • Project URL            → SUPABASE_URL
        • anon / public API key  → SUPABASE_ANON_KEY
   4. Done. Registrations will appear in Table Editor → registrations,
      and any rows you mark released = true in `resources` become
      live download links on the site automatically.

   NOTE: the anon key is safe to publish — row security in the setup
   SQL only allows inserting registrations and reading released
   resources. Nothing else.

   Until the keys are filled in, the site still works perfectly:
   the form shows a friendly "service not configured" notice and the
   Resources page shows its "releasing soon" placeholders.
   ———————————————————————————————————————————————————————— */

export const CONFIG = {
  /* Registration portal gate — flip to true when registrations open.
     While false: the register page stays browsable, but the wizard box
     is blurred + inert under an "Opening Soon" stamp. */
  REGISTRATIONS_OPEN: false,

  /* Committees reveal gate — flip to true on reveal day.
     While false: the committees page shows a compact "Decks Open Soon"
     panel visitors simply scroll past (no deck, no portfolio walls),
     and committee deep-links render a sealed notice. The full dossier
     deck is untouched — flipping the flag restores everything as-is. */
  COMMITTEES_REVEALED: false,

  SUPABASE_URL: "",            // e.g. "https://abcdefgh.supabase.co"
  SUPABASE_ANON_KEY: "",       // e.g. "eyJhbGciOi..."
  REGISTRATIONS_TABLE: "registrations",
  RESOURCES_TABLE: "resources",
  STORAGE_BUCKET: "resources", // public bucket for study guides etc.
};

/* Quick check used across the site */
export function supabaseConfigured() {
  return Boolean(CONFIG.SUPABASE_URL && CONFIG.SUPABASE_ANON_KEY);
}
