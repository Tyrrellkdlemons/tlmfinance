/**
 * tlm-config.js — TLM Finance runtime config.
 *
 * Paste your Supabase credentials below and the rest of the site picks them
 * up automatically — Google / Apple / Facebook OAuth, email-password sign-up,
 * cross-device plan saving, the admin user table, the audit log, and the
 * weekly newsletter subscribers list.
 *
 * Get the values from Supabase → Project Settings → API:
 *   • Project URL  (e.g. https://abcdef12345.supabase.co)
 *   • anon public key (long JWT starting with "eyJ…")
 *
 * The anon key is SAFE to ship in the browser — write access is controlled
 * by Supabase Row Level Security. NEVER paste the service_role key here.
 */
(function () {
  window.__TLM_CONFIG = Object.assign({}, window.__TLM_CONFIG || {}, {

    // ---- 1. Wired live to your Supabase project (TLM Finance) ----------------
    supabaseUrl:     "https://oaioqiydnrpgwbflhnba.supabase.co",
    supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9haW9xaXlkbnJwZ3diZmxobmJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0MTMwOTAsImV4cCI6MjA5Mjk4OTA5MH0.ogHSUZ__J4hSCAaxGY_y-p0_iMnKyj2ey14xQAb3hqw",

    // ---- 2. Optional — flip to true to bring back the blocking contact gate --
    forceContactGate: false,

    // ---- 3. Optional — extra OAuth redirect (leave blank to use current URL) -
    oauthRedirectTo: ""

  });
})();
