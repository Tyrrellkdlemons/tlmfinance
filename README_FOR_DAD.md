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
