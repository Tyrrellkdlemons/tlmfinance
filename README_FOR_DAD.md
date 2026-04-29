# TLM Finance — Site Walkthrough for Dad

**Project:** TLM Finance ("Paving the Road")
**Live site:** https://tlmfinance.netlify.app
**Repo:** https://github.com/Tyrrellkdlemons/tlmfinance.git
**Reviewed:** 2026-04-27
**Author of this note:** Tyrrell

---

## 1. What this site is

A free, private, mobile-first web app that helps people coming home from prison plan their first 90 days back. It is inspired by **The Last Mile** (the nonprofit that teaches coding inside correctional facilities) but is a separate, independent project — it is not officially affiliated unless TLM gives written permission.

Three things it does for the user:

1. **Builds a real money plan** for the first 72 hours, 30 days, 60 days, and 90 days after release.
2. **Teaches modern finance and tech in plain language** — banking, credit, savings, crypto, AI tools (ChatGPT / Claude), tech careers, scam avoidance.
3. **Lists vetted reentry resources** (jobs, ID/documents, legal, health, food, housing, hotlines) — every one sourced and dated.

**Privacy is the headline feature.** No login. No accounts. No analytics. The plan is saved in the browser only. Nothing is sent to a server unless the user explicitly exports it (JSON, CSV, mailto, print, or share).

---

## 2. How the site is laid out

The site is a static PWA — plain HTML, CSS, and JavaScript, no build step. There are **eight pages** at the root:

| Page | URL | What it does |
|---|---|---|
| `index.html` | `/` | Landing page. Cinematic sunrise hero, the 7-step planner, KPI dashboard, builder cards, impact stats, resource hub, Project Rebound section. |
| `learn.html` | `/learn.html` | Education hub. Plain-language lessons on banking, credit, savings, money apps, crypto, AI tools, tech careers, scam avoidance. |
| `hub.html` | `/hub.html` | Deeper learning tracks: Money & Banking, AI Literacy, Crypto Basics, Entrepreneurship, Study Anything, Modern Tech Jobs. |
| `watch.html` | `/watch.html` | Video + audio. Featured YouTube tiles, TLM Radio links (Spotify, SoundCloud, SiriusXM Saturdays @ 12pm ET). |
| `feed.html` | `/feed.html` | Unified social timeline aggregating TLM's site, YouTube, LinkedIn, Instagram, Facebook, X, Spotify, SoundCloud — filterable by type. |
| `radio.html` | `/radio.html` | TLM Radio dedicated page. Host Tara Trask, ~93 episodes with summaries, links to every podcast platform. |
| `media.html` | `/media.html` | Press kit, official socials, annual report PDFs, press contact. |
| `admin.html` | `/admin.html` | **Hidden** owner-only panel for editing hero copy, counters, and disclaimers. Saves to localStorage. Access via triple-click on the logo, `Ctrl+Shift+A`, a 1.4-second long-press, or by adding `#admin` to the URL. |

There is also a **bottom nav bar** that shows on mobile, with iOS safe-area padding so it doesn't sit under the notch.

---

## 3. The information the site holds

All content lives in five files so it's easy to update without touching code.

**`src/data/resources.json`** — 25+ vetted reentry resources. Each entry has: `title`, `category` (jobs / tech / education / money / legal / health / emergency / documents), `description`, `bestFor`, `cost`, `location`, `url`, `source`, `lastChecked`. Examples: TLM Workforce Reentry, CSUF Project Rebound, CFPB *Your Money, Your Goals*, FDIC *Money Smart*, the National Reentry Resource Center, DOL Reentry Employment, 211, Findhelp, CDC Reentry Health, SAMHSA, the 988 crisis line, SSA, housing/financial-aid tools.

**`src/data/people.json`** — 6 leadership/alumni cards: Chris Redlitz (co-founder), Beverly Parenti (co-founder), Kevin McCracken (Executive Director, returned citizen), Tulio Cardozo (staff engineer / alumnus), Alysha Eppard (alumna, Indiana Pacers), Ken Oliver (board, Checkr Foundation). Each has a sourced summary, an accent color, and a silhouette placeholder — **no real photos yet** because TLM has not granted image permission.

**`src/data/tlmStats.json`** — 6 impact metrics, each tagged with year and source link: 451 students served (2024), 75% alumni employment (2025), <8% recidivism vs. 64% U.S. average (2025), 90% in further education (2025), ~1,000 alumni total (2026), 16 facilities across 7 states (2026). Also lists 9 alumni employers (Google, Microsoft, Amazon, Apple, Meta, Nvidia, NASA, Capital One, Indiana Pacers).

**`src/data/media.json`** — Official TLM URLs (YouTube, LinkedIn, Instagram, X, Facebook, Spotify, SoundCloud), 6 featured YouTube IDs, and 10+ radio episode summaries.

**`docs/research/SOURCE_MAP.json`** — 39 sourced facts. Every stat, claim, and resource link maps to a source URL plus a `lastChecked` date (currently 2026-04-24). All HTTPS only.

---

## 4. How the site functions (architecture)

**Front end:** Plain HTML, CSS, and vanilla JavaScript. No React, no build tools. Loads instantly.

**State and persistence (`src/utils/storage.js`):** The user's plan lives in **localStorage** under the key `paving-the-road:plan:v1`. The schema is one big object with arrays for needs, income, benefits, expenses, debts, goals, documents, and four timelines (72-hour / 30-day / 60-day / 90-day). Every change writes immediately. If the user clears their browser data, the plan is gone — JSON export is the recommended backup.

**Planner math (`src/utils/budgetCalculator.js`):** Pure functions calculate monthly income, monthly expenses, monthly debt payments, net cash flow, and a savings target. `riskFlags()` returns up to 9 plain-English warnings (e.g., overspending, missing transit plan, light 72-hour plan). `debtPriority()` sorts debts using the avalanche method (highest APR first), tie-broken by smallest balance.

**Export (`src/utils/exportPlan.js`):** Five export paths — `exportJSON()`, `exportCSV()`, `planToText()` (for case managers), `shareOrCopy()` (uses native Web Share on mobile, clipboard fallback elsewhere), and `caseManagerEmail()` (opens a `mailto:` draft — never auto-sends).

**Main app (`src/app.js`, ~500 lines):** Boots the planner, renders the step-by-step forms, updates KPIs live, runs the Freedom Plan Panel modal (a quiz that generates a 72-hour plan from 8 selected needs), and triggers confetti on plan completion (skipped if the user has *prefers-reduced-motion* set).

**Chatbot (`src/chatbot.js`):** Privacy-first AI helper.
- No login, no API key in the page, no user tracking.
- Routes through three public **Pollinations** relay endpoints with automatic failover.
- A system prompt locks the bot to: site navigation, money planning, banking, credit, crypto, AI, careers, study skills.
- If a user asks about parole, expungement, immigration, custody, or voting rights, the bot politely declines and redirects them to the National Reentry Resource Center, Root & Rebound, or 211.
- Includes jailbreak and topic guards. Chat history lives in memory only, never in storage.

**Hidden admin (`src/admin-overrides.js` + `admin.html`):** Loads on every page and reads `tlm:admin:v1` from localStorage. The admin panel lets the owner edit the hero eyebrow, headline, lede, disclaimer, alumni/employment/recidivism counters, and theme variant — without redeploying. Changes live in localStorage on the admin's device.

**PWA / offline (`manifest.json` + `service-worker.js` v13):** The manifest defines five home-screen shortcuts (Plan, Hub, Learn, Radio, Watch) and standalone display. The service worker caches the "shell" (HTML, CSS, JS, JSON, icons) on install and serves cached content first, then refreshes in the background (stale-while-revalidate).

**Optional serverless backup (`netlify/functions/sync.js`):** A Netlify Function (Node 20) that can sync a plan to a Neon Postgres database. **Disabled by default.** It only turns on when the env var `SYNC_ENABLED="true"` is set, the user opts in, and provides an anonymous device key. It stores only `device_key` and `plan_json` (≤64 KB). No names, no addresses.

**CI / CD (`.github/workflows/deploy.yml` + `scripts/validate.mjs`):** Every push and pull request runs `validate.mjs`, which checks that all 8 HTML pages exist, every JSON parses, `resources.json` has at least 20 entries with title/url/lastChecked, `SOURCE_MAP` has at least 10 HTTPS URLs, and the service worker still has a SHELL array. If anything fails, the build fails. On main, it deploys to Netlify production. On a PR, it deploys a preview and comments the URL.

---

## 5. Look, feel, and accessibility

- **Theme:** TLM-inspired charcoal (`#0E0E0E`) + gold (`#DAA520`) + cream. Auto dark/light via `prefers-color-scheme`.
- **Hero animation:** Layered sunrise — a star canvas (140 twinkling stars), 50 rising gold particles, an animated sunrise gradient, rotating sun rays, walking silhouettes, breaking chains, drifting birds.
- **Responsive:** Mobile-first. 1 column ≤480px, 2 columns at 720px, 3–4 columns at 980px. Bottom nav has `safe-area-inset` padding for iPhone notches.
- **Accessibility:** Skip link, focus rings (3px gold, 2px offset), semantic headings, `aria-pressed` / `aria-hidden` / `aria-current` / `aria-label`, the Freedom Plan Panel uses `role="dialog"`.
- **Reduced motion:** `@media (prefers-reduced-motion: reduce)` disables nearly every animation (sunrise, rays, walking figures, chains, birds, confetti, scroll reveals).
- **Print:** `print.css` produces a clean one-column layout with URL citations beside every link, so a printed plan still has its sources.

---

## 6. What's working well

- Loads fast — no framework overhead, zero blocking JS.
- The planner KPIs update live as the user types.
- 25+ resources are real, dated, and sourced.
- Every impact stat is dated and links to its source — no guesswork.
- Strong privacy posture (no analytics, no third-party fonts, local-only by default).
- Service-worker shell cache means it works even on a flaky connection.
- The CI validator catches broken JSON or missing pages before deploy.

---

## 7. What needs to be tweaked or fixed

I split this into **bugs (real issues), security (worth hardening), content (manual work), and polish (nice-to-have)** so it's easy to triage.

### 7a. Bugs

- **Service-worker cache is missing two files.** `admin.html` and `src/admin-overrides.js` are not in the SHELL array in `service-worker.js`. The admin panel won't work offline because of it. Add both paths to the SHELL list and bump the cache version.
- **Top-level `README.md` is severely out of date.** It only describes `index.html` and `media.html` and omits learn, hub, watch, feed, radio, admin, the chatbot, and the Netlify function. Either update it or replace it with this document.

### 7b. Security

- **Admin panel has no real auth.** Access is only protected by gesture obscurity (triple-click logo, `Ctrl+Shift+A`, long-press, or `#admin` hash). Anyone who knows the URL can open `admin.html` directly. The panel only writes to *that visitor's* localStorage, so it can't damage other users — but it does let a stranger believe they're editing the live site and could be confusing. Recommended: gate the panel behind a shared-secret token kept in localStorage that has to match a value baked into the deployed JS, or move admin to a path Netlify password-protects.
- **No Content Security Policy header.** The site loads YouTube, Spotify, and Pollinations endpoints. A strict CSP would shut down most XSS risk in one move. Add a `_headers` file (Netlify reads it automatically) with a `Content-Security-Policy` line.
- **Pollinations relay is public and unauthenticated.** That's by design (no exposed API key), but it does mean the chatbot can be rate-limited or rerouted by Pollinations at any time. The code already does endpoint failover; consider also caching a "service unavailable" message rather than a stack trace if all three relays go down.

### 7c. Content (manual work, not code)

- **TLM logo and portraits.** The site uses placeholder branding and silhouette avatars. Email `info@thelastmile.org` for written permission and link to the press kit before swapping in the official mark and real photos.
- **Legal disclaimer.** The current planner/footer disclaimer is a starting point — needs an attorney review before any public launch.
- **Local resource list.** LA / Orange County partners are placeholders. Confirm partner names and contacts and update `src/data/resources.json`.
- **Stat refresh.** Update `src/data/tlmStats.json` and the per-metric `year` field as soon as the next TLM Annual Report drops.
- **Quarterly link audit.** Re-verify every `url` in `resources.json` and `SOURCE_MAP.json` and bump `lastChecked`.

### 7d. Polish

- **Photos:** Replace silhouette placeholders only with explicitly licensed images. Until then, keep the silhouettes.
- **Run a real accessibility audit.** Pull the site into axe DevTools and Lighthouse; the codebase looks clean but only an automated pass will catch contrast or label gaps.
- **Add an `og-image.png` test.** The HTML references `/assets/social/og-image.png` and `og-square.png` for share previews — confirm both files exist on the deployed site (404s here look bad on social).
- **Bottom-nav active state.** Worth confirming `aria-current="page"` is on the right tile when navigating between pages (it's set on index, double-check the others).
- **Service-worker version bump habit.** Any time the SHELL list or any cached file changes, bump the version constant in `service-worker.js` so old caches get evicted on next visit.

---

## 8. How to run it

No build step.

```bash
# Quick (Python)
python3 -m http.server 8080
# then open http://localhost:8080

# Or Node
npm start    # uses npx serve on port 8080
```

The service worker only registers over HTTPS or `localhost` — opening `index.html` by double-click works for layout but disables offline mode.

## 9. How it deploys

- **Production:** push to `main` on GitHub. The GitHub Action runs `validate.mjs`, then deploys the whole folder to Netlify with `netlify deploy --prod --dir=.`
- **Preview:** open a PR — Netlify posts a preview URL as a comment.
- **Manual:** `npm run deploy` or drag the folder onto https://app.netlify.com/drop.

---

## 10. TL;DR

It's a privacy-first reentry-planning PWA: 8 pages, ~25 vetted resources, a 90-day money planner that lives entirely in the browser, an AI chatbot routed through a free public relay, a hidden admin panel for the owner, and a Netlify deploy gated by a JSON/HTML validator. The biggest things to fix are the **out-of-date README**, the **service-worker missing two admin files**, and the **admin panel needing real auth**. Everything else is content/refresh work.

— Tyrrell

---

## 11. Updates · April 28, 2026 — Auth, Compliance, Admin & Planner Pro

Since the April 27 review, the site jumped a full version forward. Three big themes: a real **authentication layer**, **legal/brand compliance work** so the site can actually publish on Facebook and Google, and a **complete reinvention of the planner** into a guided, intelligent, cloud-syncing experience. Privacy posture is preserved — sign-in is **only required if the user wants to save their plan to the cloud**. The site is fully usable signed-out exactly as before.

### 11a. Authentication is now live

- **Supabase project** (`oaioqiydnrpgwbflhnba`) wired into `src/tlm-config.js` (URL + anon key). Three tables behind Row-Level Security: `tlm_subscribers` (newsletter list), `tlm_audit` (sign-in / save / admin events), `tlm_plans` (cloud-saved planner state, owner-only access). SQL bootstrap is committed at `docs/supabase-bootstrap.sql`.
- **Three sign-in methods, all working:**
  - **Email + password** (Supabase default).
  - **Google OAuth** — Cloud project "TLM Finance," app published in production. Client ID + secret pasted into Supabase. (Google's secret field had to be re-entered once — the first save dropped it silently and threw `validation_failed: missing OAuth secret` on first sign-in. Re-entered → fixed.)
  - **Facebook OAuth** — Developer App `1751165142521435`, redirect URI back to Supabase callback. App is in **developer mode** for now: only test users + the admin can sign in publicly. Going Live mode requires Meta's business verification + App Review (a multi-week process), which we're skipping until launch.
- **Site URL Configuration in Supabase:** site URL `tlmfinance.netlify.app`, redirect URLs include both prod and `localhost:3000` so local testing works.
- **Auth UI (`src/auth.js`):** Supabase-backed with a `localStorage` fallback so the site never breaks if Supabase is down. The user sees a polished modal with tabs (Sign in / Create account), social buttons (Google, Facebook), and a newsletter opt-in checkbox on the sign-up tab. A **portal pill** in the top nav and a 6th cell in the mobile **bottom nav** (`Account`) handle entry. When signed in, the pill becomes an avatar with a dropdown (My plan / Sign out). Every auth event writes to `tlm_audit` via a `logEvent()` helper.
- **Login is gated to "save" intent only.** `src/contact-gate.js` was neutralized (it now only fires when `forceContactGate` flag is on). Instead, every Save button on the planner (Print, Save to phone, Export JSON, Export CSV, Share, Copy, Send to case manager) wraps an `ensureSignedInForSave()` call that pops the auth modal if the user isn't already signed in. The plan itself still saves to localStorage as the user types — sign-in is only the gate for cloud-sync and exports.

### 11b. Legal & brand compliance pages (Facebook/Google requirements)

To get OAuth approved I had to ship three new public pages and a real app icon:

- **`privacy.html`** — privacy policy (no analytics, no third-party fonts, what we collect via Supabase auth, what we don't).
- **`terms.html`** — terms of service.
- **`data-deletion.html`** — Facebook-required user data deletion instructions, on its own URL because Facebook's validator caches the URL it first sees.
- **`assets/icons/icon-1024.svg`** + **`assets/icons/make-icon-1024.html`** — the TLM Finance app icon. The `.svg` is the master art (charcoal background, gold sunrise + road + chained-becoming-free silhouettes, "TLM" wordmark). The `.html` page renders the SVG to a 1024×1024 canvas and offers a one-click PNG download for the Facebook / Apple / Google app icon slots — done in-browser, nothing leaves the page.

While registering Facebook there were two notable gotchas worth flagging:
1. The Facebook validator threw "`name_placeholder should represent a valid URL`" because it had **cached** an earlier failed URL. Switching the dropdown to "Data deletion callback URL" and back, then pasting the explicit `.html` URL, cleared the cache.
2. Same secret-save issue as Google — Facebook's App Secret had to be re-entered in Supabase a second time after the field appeared blank.

### 11c. Admin panel — real upgrade

The admin panel is no longer just hero-copy editing. **`admin.html`** + **`src/admin-overrides.js`** now ship with:

- **Three secret entry methods** (instead of the original four — simpler, harder to stumble into):
  1. **Click the logo 7 times in 3 seconds.**
  2. **Type the literal string `TLMadmin`** anywhere on any page.
  3. **Konami code** (↑ ↑ ↓ ↓ ← → ← → B A).
- **Page-hide enforcement** — admin can flip individual pages (Learn, Hub, Watch, Feed, Radio, Media) from "live" to "hidden" without redeploying. Hidden pages 404 in nav. Driven by `tlm:adminPages:v1` in localStorage.
- **Three tabs:**
  - **Sign-ins & subscribers** — pulls live from Supabase (`tlm_audit` for sign-ins, `tlm_subscribers` for the newsletter list) with localStorage fallback if Supabase is unreachable.
  - **Audit log** — every login, save-to-cloud, plan-export, and admin entry, with timestamp + user.
  - **Pages & visibility** — toggles described above + hero copy / counter overrides.
- **`src/tlm-config.js`** is the single source of truth for runtime config (Supabase URL + anon key) and is already populated with live values.

### 11d. Planner reinvention — "Planner Pro"

The biggest user-facing change. The planner **kept its 7-step structure and data shape** so existing exports / case-manager email / cloud-sync all still work — but the UI/UX is completely rebuilt:

- **Visual icon stepper.** Each step shows an icon, a short label, and a checkmark when complete. Replaces the old text-only "Step 1 of 7" header.
- **~50 smart suggestion chips** across all steps. Tap a chip to pre-fill an income source, expense category, debt type, goal, or document — no typing required for the most common cases. Reduces friction enormously for low-literacy / low-typing-comfort users.
- **4 quick-start templates** appear on Step 1 before any income is entered:
  1. *Just released, no income yet*
  2. *Working part-time*
  3. *School + side hustle*
  4. *Family support setup*
  Each template seeds realistic placeholder rows the user then edits — gets people from a blank screen to a usable plan in seconds.
- **Currency-formatted inputs.** All money fields format on blur via `Intl.NumberFormat` ("$1,250.00") so the plan looks professional and is easier to scan.
- **"I don't have any" acknowledgment toggles** for each step (income, expenses, debts, goals, documents) so the plan can move forward honestly without forcing fake entries.
- **Goals with ETA.** Each goal calculates how many months until you hit it given current cash flow.
- **Documents grid with progress bar.** Visual checklist (ID, Social Security card, birth certificate, lease, employment letter, etc.) with a "X of 12 documents collected" progress bar.
- **Sequence cards (72h / 30d / 60d / 90d) with quick-task chips and checkbox strikethrough.** Mark a task done → it strikes through and counts toward step completion.
- **Plan health score (0–100).** Composite of step completion + cash-flow ratio + documents collected, color-coded.
- **Color-coded cash-flow ratio bar** (green / amber / red) on the live summary.
- **Smart contextual tips** per step — debt-strategy tip on the debts step, savings-pace tip on the goals step, etc. Plain language, no jargon.
- **Cloud-sync to Supabase `tlm_plans` table** for signed-in users, debounced 1.2s, with a **live sync indicator pill** next to "Live Summary":
  - "Saved on this device" (signed-out / fallback)
  - "Saving to cloud…" (in flight)
  - "Synced to cloud · 3:41 PM" (last successful save)
- **Mobile + accessibility polish.** All new components have `prefers-reduced-motion` overrides and three responsive breakpoints (760px, 540px, 480px).

`src/app.js` now boots the Pro planner. `src/styles/globals.css` has ~440 new lines under a clearly marked "PLANNER PRO" section. `index.html` only changed in one place (added the sync indicator next to "Live Summary").

### 11e. Sitewide polish + bug fixes from the audit

- **Bottom nav locked to dark charcoal sitewide.** It used to flip cream under `prefers-color-scheme: dark` because of `--ink`. Locked override added so the nav is always charcoal regardless of system theme.
- **Hover accessibility fix.** `a:hover { color: var(--tlm-gold-deep) }` was washing out on dark surfaces because `--tlm-gold-deep` (`#8C6810`) is unreadable on charcoal. Override added on `.section--dark`, `.section--charcoal`, `.footer`, `.tlm-chat`, `.fp-wizard`, and `.plan-panel` to force `#FFD970` (cream gold).
- **`.btn--ghost:hover` lock** — was flipping white in dark mode, now locks to gold-on-charcoal regardless of theme.
- **Universal "Jump to" nav-card style** across Learn / Hub / Feed / Radio so all four pages feel consistent.
- **Link-rot audit fixes:** CFPB pay-stub link (was 404, now points to direct PDF), CareerOneStop library finder, VA reentry, CSU Project Rebound — all re-verified and updated.
- **`index.html` mid-tag truncation repaired.** Line 484 was cut mid-script-tag (`<script src="./src/admin-ov`). Closed properly with admin-overrides + auth scripts and `</body></html>`.
- **Stray broken CSS fragments removed** (`-install-cta { animation: none; }` orphan and a `, .gold-text { animation: none; }` orphan).
- **Netlify Functions** added: `chat.js` (relay for the chatbot), `notify.js` (admin email pings), `newsletter.js` (newsletter signup if Supabase is unreachable). All in `netlify/functions/` with a shared `package.json`.

### 11f. What's NOT changing (preserved on purpose)

- The privacy posture: **no analytics, no third-party fonts, plan saves to localStorage by default, sign-in is only required for cloud-sync.**
- Every page from the original 8 — Learn / Hub / Watch / Feed / Radio / Media / Admin / Index — is still there, same URLs.
- The chatbot is unchanged (still Pollinations relay, still no API key in the page).
- Service-worker shell-cache, CI validator, JSON data files — unchanged.
- All export paths (JSON, CSV, mailto, share, copy, print) still work and still produce the same shape.

### 11g. Known gaps still on the punch list

- Facebook is in developer mode only — Live mode requires Meta business verification (multi-week).
- The two `service-worker.js` SHELL gaps from the original audit (`admin.html`, `src/admin-overrides.js`) — **still need to be added** before the next deploy. Bump the cache version when you do.
- Top-level `README.md` is still out of date — this `README_FOR_DAD.md` is the current source of truth.
- TLM logo / portraits still placeholder (waiting on `info@thelastmile.org` written permission).
- Legal disclaimer in footer still needs attorney review before public launch.

### 11h. Pre-deploy accessibility audit (WCAG 2.1 AA)

Right before deploy I ran a full a11y pass on the new Planner Pro additions and fixed everything I found. None of the issues were show-stoppers — most were "screen-reader users would have a worse experience than sighted users." Now they're at parity.

**What was checked.** The visual stepper, suggestion chips, quick-start templates, "I don't have any" toggles, document grid + progress bar, sequence cards (72h/30/60/90), the live cloud-sync pill, and the plan-health score card. Plus a sweep on the auth modal and the new `plan.html` inline view.

**What I fixed:**

- **Cloud-sync pill announces state changes.** Added `role="status"` + `aria-live="polite"` + `aria-atomic="true"` to `#planSync` so screen readers say "Saving to cloud… / Synced to cloud · 3:41 PM" out loud — sighted users get the visual change for free, but SR users were silent before.
- **Decorative emoji icons are now hidden from screen readers.** All the emoji on chips (`💵 Job income`), step buttons (`💰 Income`), templates (`🆕 Just released`), document rows, day-card headers, and the step counter number now carry `aria-hidden="true"` — SR no longer reads "knife and fork dollar sign job income," just "Add Job income."
- **Stepper buttons use the right ARIA pattern.** Was `role="tab"` with `aria-current="true"` (incorrect — `tab` requires a `tablist` parent and a `tabpanel` association). Switched to plain buttons with the proper `aria-current="step"` on the active step plus a full `aria-label="Step 3 of 7: Expenses, complete, current"`.
- **Progress bars are real progress bars.** The top "Planner progress" bar and the "Documents collected" bar got `role="progressbar"` + `aria-valuemin` + `aria-valuemax` + `aria-valuenow` + `aria-valuetext` — SR users now hear "Planner progress, step 3 of 7."
- **Every checkbox has an explicit label.** The day-row task checkboxes and document checkboxes were wrapped in styled `<div>`/`<label>` but the checkbox itself had no name. Each now carries an `aria-label` like "Mark Phone bill as collected" or "Mark task complete: Apply for state ID."
- **Chip and template buttons announce their full action.** Each chip ("`+ Job income`") now has `aria-label="Add Job income"`. Each template ("Just released, no income yet") has `aria-label="Quick start template: Just released, no income yet. Pre-fill from a common scenario."`
- **Visible focus rings on every new interactive surface.** Added `:focus-visible` styles for `.plan-step`, `.plan-chip`, `.plan-template`, `.plan-add-btn`, `.plan-doc`, `.plan-row__del`, `.plan-doc__del`, `.plan-day-row input`, `.plan-doc input`, `.plan-ack input` — 3px gold ring + 2px offset. Was relying on browser default before, which is sometimes invisible.
- **Dark-mode contrast bumps for `--tlm-gold-deep` text.** `#8C6810` is ~5.5:1 against cream (passes 4.5:1 on light theme) but only ~3.5:1 against charcoal (fails on dark theme). Under `prefers-color-scheme: dark`, `.plan-row__eta`, `.plan-step-head__count`, `.plan-add-btn`, `.plan-score__num--mid`, the syncing pill, and `.plan-chip:hover` now switch to `#FFD970` (cream gold, ~10:1 on charcoal).

**Already good — no changes needed.** Auth modal already had `role="dialog"` + `aria-modal="true"` + `aria-labelledby` + autofocus on the email field and a labeled close button. Account dropdown already had `aria-haspopup="menu"` + `aria-expanded`. The `+` add buttons already had `aria-hidden` on the icon span and visible text. All `×` delete buttons already had `aria-label="Remove …"`. The planner panel already had `aria-live="polite"`.

**Tested with:** keyboard-only navigation (Tab/Shift-Tab/Enter/Space across the planner), `prefers-reduced-motion` (animations disabled correctly), `prefers-color-scheme: dark` (all text passes 4.5:1), and 200% browser zoom (layout reflows, doesn't break).

### 11i. Inline plan view (new) + Save Progress button

You can now see your full plan on a dedicated page — `plan.html` — that loads from localStorage (and from Supabase if you're signed in, picking whichever copy is newer). It works **even while the plan is in progress** — empty sections show a friendly "Nothing here yet" instead of breaking. Sections covered: KPIs (income, expenses, net cash flow, savings target), plan-health score, income, benefits, expenses, debts, goals, documents grid (✓/○ on each), and all four sequence windows (72h / 30 / 60 / 90) with completed tasks struck through.

The page mirrors all existing actions — Print, Share, Copy summary, Export JSON, Export CSV, Send to case manager — and adds a new **💾 Save progress** button (also added to the index planner action row). Behavior:

- **Signed in:** flushes the 1.2-second auto-sync debounce and pushes immediately to Supabase, then toasts "Progress saved to cloud."
- **Signed out:** offers a one-tap sign-in pop-up (so the next visit on any device picks up where you left off), or lets you skip and just save locally with a "Saved on this device" toast.

Both `plan.html` and the new Save button surface the same `role="status"` sync pill so screen readers hear "Saving to cloud… / Synced · 3:41 PM" the same way they do on the planner. The mobile bottom nav has a 5th cell on `plan.html` that highlights "My plan" with `aria-current="page"`.

### 11j. The macro planner has its own page now (`planner.html`)

This is a structural change to how the site is organized — small in code, big in framing. Until now the full Planner Pro lived inline inside `index.html` under the `#planner` anchor, sharing the page with the hero, the Freedom Plan Panel quiz, the impact stats, the resources hub, and Project Rebound. As the planner grew into the site's actual core feature, that crowding stopped serving users.

**The new layout, in two sentences:** `planner.html` is now the dedicated home of the full 90-day planner — that's the page the "Plan" link in every nav points to. `index.html` remains the landing page and still hosts the Freedom Plan Panel as the **60-second micro plan** for people who want a printable starter list in a hurry, and now ends with a clear handoff to the full planner.

What changed where:

- **New page: `planner.html`.** Hero introduces the planner directly ("Your 90-day money plan"), then a 4-tile feature strip (Smart suggestions · Plan health score · Cloud sync · Private by default), then the full planner below. Quick-start links at the top point to the micro plan (`index.html#fpp`) and the read-only inline view (`plan.html`). All seven steps, all the chips, templates, save buttons, and the live sync indicator come along verbatim — same DOM IDs so `src/app.js` boots identically.
- **`index.html`'s old planner section becomes a CTA card.** Same `#planner` anchor (so any old bookmark still lands somewhere sensible), but the inline planner is replaced by a two-column card: left side "Open the full planner" (lists the macro features and points to `planner.html`), right side "60-second micro plan" (opens the FPP quiz). One coherent surface that explains the choice instead of dropping users into the deep planner without context.
- **The Freedom Plan Panel suggests the full planner.** The modal subtitle now reads "Pick everything that applies. We'll generate a 72-hour plan and link to resources. Want a deeper plan? Open the full 90-day planner →" The button row gained a dark "Open the full planner →" button next to the primary "Generate my 72-hour plan." After the 72-hour starter plan generates, a gold-bordered banner appears at the bottom: "Take this further. Open the full **90-day planner** — your 72-hour starter carries over automatically." Single click into `planner.html` with the data already in localStorage.
- **Site-wide nav update.** Every page (Learn, Hub, Watch, Feed, Radio, Media, Privacy, Terms, Data-deletion, Plan, Index, Planner) now has its top-nav "Plan" tab, top-right "Build My Plan" CTA where applicable, and mobile bottom-nav "Plan" cell pointing to `./planner.html`. No more `#planner` anchor links anywhere in nav.
- **`media.html` repair.** That file had trailing null-byte padding from an earlier save error — stripped during the nav update.

**Service-worker punch-list cleanup (the long-standing 7a item).** While I was in there, I bumped `service-worker.js` to `v14` and added the missing files. The SHELL now includes `planner.html`, `plan.html`, `admin.html`, `src/admin-overrides.js`, `src/auth.js`, `src/contact-gate.js`, `src/tlm-config.js`, plus the legal pages (`privacy.html`, `terms.html`, `data-deletion.html`). This closes the **two service-worker gaps** flagged in section 7a since the original audit (admin.html + admin-overrides.js were missing — fixed) and pre-caches everything new from sections 11h–11j. Old caches get evicted on next visit because of the version bump.

**What didn't change.** Same DOM IDs across the planner. Same `state.plan` shape. Same Supabase tables. Same auth flow. Same exports (Print, JSON, CSV, mailto, share, copy). Same Freedom Plan Panel quiz logic. Same admin entry methods. Same data files. The advanced future-plan wizard (`openFuturePlanWizard`) is preserved — still reachable from the FPP modal's "Advanced wizard" button.

**Updated punch list.** Two items shrink:
- ~~Service-worker SHELL gaps~~ → done.
- Top-level `README.md` is still out of date (this `README_FOR_DAD.md` remains canonical).
- Facebook is still developer-mode only.
- TLM logo / portraits still placeholder.
- Legal disclaimer still needs attorney review.

### 11k. Freedom Plan Panel works everywhere now + naming cleanup

This is a quality-of-life change with a small naming adjustment: every page on the site can now pop up the **Freedom Plan Panel** as a bottom sheet, the wording on the two main CTAs got more accurate, and the Advanced Wizard button always does something useful.

**Names that changed (consistent everywhere now):**

- **"Build My Plan"** → **"Generate planner"** — that's the gold pill button in the top-right of every page. Tap it and the Freedom Plan Panel slides up from the bottom. Quick quiz, 72-hour starter plan.
- **"Open the full planner"** → **"Open the customizable plan"** — that's the deep planner page (`/planner.html`) with the chips, templates, plan-health score, and cloud-sync. Same destination, just a clearer label for what it actually is.
- **"Build My Plan" / "Open my plan"** sprinkled across older copy → all consolidated to one of the two names above.

**The Freedom Plan Panel pops up from the bottom on every page.** Until now it lived only on `index.html` — clicking "Build My Plan" anywhere else navigated home and then opened it. Now it's a self-injecting bottom-sheet that's available **everywhere**: home, planner, plan, hub, learn, watch, feed, radio, media, privacy, terms, data-deletion. Even compliance pages got a "Generate planner" button in the top-right so the path to start a plan is one tap from anywhere.

**How that works under the hood:** `src/freedom-plan-panel.js` is a single ~270-line script that loads on every page. The first time the user clicks any `data-open-plan` button, it injects the panel markup if it isn't already in the DOM, wires up the quiz, and shows the slide-up sheet. On `index.html` (where the panel was already in the markup) it deferentially hands off to `app.js` so we don't double-fire anything. On every other page it owns the whole quiz lifecycle: rendering needs cards, generating the 72-hour starter plan, downloading/printing the PDF, and showing the upgrade banner that points to the customizable plan. Same `localStorage` key as the macro planner, so anything you start in the bottom sheet shows up automatically when you open `/planner.html` later.

**Auto-open from URL hash.** Any page can deep-link straight into the panel by appending `#fpp` to its URL — useful for emails, social posts, or bookmarks. (The same trick works for `#wizard` on `/planner.html` to jump straight into the Advanced Wizard.)

**Advanced Wizard button now always does something.** The "Advanced wizard" button in the panel's button row used to error out on pages where `app.js` wasn't loaded (which was most pages). Now: if the wizard's `openFuturePlanWizard()` function is loaded → call it directly; otherwise → navigate to `./planner.html#wizard` and `app.js` auto-opens the wizard there. Either way, the click goes somewhere useful.

**Universal screen-reader behavior preserved.** The bottom sheet has `role="dialog"` + `aria-modal="false"` + `aria-labelledby` + `aria-hidden` toggles so assistive tech announces it correctly. ESC closes it. Focus moves into the panel on open. Same accessibility level as the auth modal.

**Service-worker cache bumped to v15.** Added `./src/freedom-plan-panel.js` to the SHELL pre-cache list so the bottom sheet works offline on every page. The version bump evicts old caches on next visit.

**Files touched in this round:**

- `src/freedom-plan-panel.js` (new, ~270 lines) — the shared bottom-sheet module.
- `src/app.js` — added `#wizard` URL hash auto-open + relabeled the upgrade banner copy.
- `index.html` — repaired (file had been truncated mid-tag again with trailing null bytes); now properly closes with all seven script tags including the new panel module.
- `planner.html`, `plan.html`, `hub.html`, `learn.html`, `watch.html`, `feed.html`, `radio.html`, `media.html`, `privacy.html`, `terms.html`, `data-deletion.html`, `admin.html` — all load the shared module; all the user-facing pages got a top-right "Generate planner" `data-open-plan` button.
- `service-worker.js` — bumped to `v15`, added the new module to SHELL.

**Verified clean before deploy:** `node --check` passes on `src/app.js` and `src/freedom-plan-panel.js`; the `<script type="module">` block in `plan.html` parses clean; all 13 HTML pages reference the shared module; all 12 user-facing pages have at least one `data-open-plan` trigger; zero remaining "Build My Plan" / "Open full planner" / "Open the full planner" strings anywhere in the project.

### 11l. Final hardening pass — admin password, CSP, chatbot upgrade, README sync

A round of security + polish work to lock things down before launch.

**Admin password gate is now real.** Previously the admin lock screen stored your passcode as plaintext in localStorage. Now it stores a **SHA-256 hash** of `salt + passcode`, where the salt is a per-install random UUID (also in localStorage but useless without the matching passcode). On first unlock the legacy plaintext key is automatically migrated to the hashed format and the old key is wiped. **Brute-force lockout** added: 5 wrong tries → 5-minute timeout, with the lock screen showing "Too many tries — locked 4 min" so attackers can't keep guessing. The placeholder text on the password field updates after each wrong try ("Wrong — 3 tries left"). The 30-day session token still keeps you signed in across visits without re-entering the passcode.

**Every admin entry method goes through the password gate.** The four ways into the admin panel — 7-click logo, type "TLMadmin," Konami code, and the legacy `Ctrl/Cmd+Shift+A` / `#admin` URL hash — all just navigate the browser to `admin.html`, where the lock screen is the first thing rendered. No bypass. Even hitting the URL directly still lands on the lock.

**Admin panel knows about the new pages.** The Pages-visibility tab's `TLM_PAGES` list now includes all 12 user-facing pages: index, planner, plan, learn, hub, feed, radio, watch, media, privacy, terms, data-deletion. You can hide any of them; hidden pages auto-redirect to home for visitors and the admin can still view them with `?adminview=1`.

**Content-Security-Policy via `_headers`.** Netlify reads the new `_headers` file in the project root. The CSP locks down everything by default and explicitly allowlists only what the site actually contacts:

- **Scripts:** self + esm.sh (Supabase ESM module) + Pollinations.
- **Connections:** self + Supabase (HTTPS + WebSocket) + esm.sh + Pollinations + HuggingFace Inference + Google + Facebook OAuth endpoints.
- **Frames (embeds):** self + YouTube (no-cookie + main) + Spotify + SoundCloud + Google + Facebook OAuth.
- **Images:** self + data: + any HTTPS + blob.
- **`object-src: 'none'`**, **`base-uri: 'self'`**, **`form-action: 'self'`**, **`frame-ancestors: 'self'`** (so the site can't be iframed by a phishing site), **`upgrade-insecure-requests`** (forces HTTPS on every fetch).

Plus the standard friends: `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` denying camera/mic/geolocation/payment, `X-XSS-Protection: 1; mode=block`. Per-path rules: `/assets/*` is immutable cache; data files cache for 5 min; service worker and manifest never cache; **`/admin.html` adds `noindex,nofollow,noarchive` + `private, no-store`** so search engines never index the admin panel and browsers don't cache it. **Note:** the policy uses `'unsafe-inline'` for scripts and styles because the site has many inline `<script>` tags and inline style attributes — could be tightened to nonces in a future pass, but the rest of the policy is strict.

**Chatbot — 13 free LLMs in rotation, 5 relay endpoints.** Refreshed the model list with current 2026-era flagship-tier free models on OpenRouter:

- **Top tier:** Llama-3.3-70B, DeepSeek-V3, DeepSeek-R1, Qwen-2.5-72B, Qwen-QwQ-32B (reasoning), Gemini 2.0 Flash, Hermes-3-405B.
- **Mid tier:** Nvidia Nemotron-70B, Gemma-2-9B.
- **Fast / small:** Phi-3-medium, Llama-3.2-3B, Mistral-7B, OpenChat-7B.

The Netlify function (`/.netlify/functions/chat`) already handled rotation server-side — it just got a longer / fresher list. After the OpenRouter relay, the chatbot now falls through **five** Pollinations endpoints (OpenAI, Mistral, POST mode, Llama variant) and finally a HuggingFace Inference API call to Mistral-7B as a last-resort. Each relay is tried in order until one returns text. Topic guards (parole, probation, expungement, immigration, custody → declines and redirects to NRRC, Root & Rebound, 211) are unchanged.

**Top-level `README.md` updated.** The stale README that only described `index.html` and `media.html` has been completely rewritten to reflect the current 13-page site: the macro Planner Pro, the dedicated `planner.html`, the inline `plan.html`, the universal Freedom Plan Panel, Supabase auth, the password-gated admin panel, the CSP + security headers, the chatbot multi-LLM rotation, and the v15 service worker. Links to `README_FOR_DAD.md` for the long narrative. Punch list now reflects what's actually still open (Facebook live mode, logo permission, attorney review, link audit).

**One thing still open from this round.** I asked Claude to "fix one symmetrical error" but didn't say where I saw it. **Need from you next session:** which page, which element, what's asymmetric (a button row that wraps unevenly? card heights that don't match? padding that's off on one side? hero alignment?). Once specified it should be a quick fix.

**Files touched in this round:**

- `admin.html` — replaced the lock script with hashed-password + brute-force lockout + auto-migration; updated `TLM_PAGES` list with all 12 pages.
- `_headers` (new) — Netlify security headers + CSP + per-path cache rules.
- `src/chatbot.js` — refreshed `OPEN_MODELS` and added two more relay tiers (Pollinations Llama variant, HuggingFace Inference Mistral).
- `README.md` (top-level) — full rewrite.

**Verified clean before deploy:** `node --check` passes on `src/app.js`, `src/freedom-plan-panel.js`, `src/chatbot.js`, `src/auth.js`, `src/admin-overrides.js`. `_headers` is in place at site root; CSP one-liner intact. Admin pages list shows all 12.

---

— Tyrrell, 2026-04-28
