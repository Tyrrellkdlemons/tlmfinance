# The Last Mile · Finance — Paving the Road

> A free, private, mobile-first reentry planning companion **inspired by The Last Mile**. Build a real money plan, track documents, and find vetted resources for the first 72 hours, 30 / 60 / 90 days after release.
>
> **Live site:** [tlmfinance.netlify.app](https://tlmfinance.netlify.app)
> **Repo:** [github.com/Tyrrellkdlemons/tlmfinance](https://github.com/Tyrrellkdlemons/tlmfinance)

This project is **not officially affiliated with The Last Mile** unless TLM grants explicit permission. Brand language uses "inspired by" and the official TLM logo isn't used until permission is in writing.

---

## 📚 Table of Contents

- [Getting Started](#-getting-started)
- [Pages & Navigation](#-pages--navigation)
- [Architecture](#architecture-no-build-step)
- [Features](#features)
- [Development](#run-locally)
- [Deployment](#deploy)
- [Scripts](#scripts)
- [Environment Variables](#environment-variables)
- [Authentication Setup](#auth-setup-one-time-already-done-in-production)
- [Status & Roadmap](#status--open-punch-list)
- [Sources & Attribution](#sources)

**📖 For a non-technical walkthrough**, see **[`docs/README_FOR_DAD.md`](./docs/README_FOR_DAD.md)**.

---

## 🚀 Getting Started

### For Users (Non-Technical)
1. Visit the live site: **[tlmfinance.netlify.app](https://tlmfinance.netlify.app)**
2. Start with the **Freedom Plan Panel** (60-second quiz) or dive into the **full 90-day planner**
3. No sign-up required — works completely offline and private
4. Optional: Sign in with Google/Facebook to sync your plan across devices

### For Developers
```bash
# 1. Clone the repository
git clone https://github.com/Tyrrellkdlemons/tlmfinance.git
cd tlmfinance

# 2. Run locally (no build step!)
python3 -m http.server 8080
# or
npx serve .

# 3. Open http://localhost:8080
```

See the [Development](#run-locally) and [Deployment](#deploy) sections below for more details.

---

## 📄 Pages & Navigation

The site is organized into several main sections, all accessible from the navigation bar:

### Main User Pages

| Page | Path | Purpose | Access From |
|------|------|---------|-------------|
| **Landing** | `index.html` | Welcome page with hero, impact stats, and quick-start CTA | Home |
| **90-Day Planner** | `pages/planner.html` | **Core feature** — Full money planner with income, expenses, debts, goals, documents, and 72h–90d timeline | Nav: "Plan" button |
| **Plan View** | `pages/plan.html` | Read-only view of your current plan — print, share, export | Planner: "View Plan" |
| **Learn** | `pages/learn.html` | Plain-language lessons: banking, credit, crypto, AI, scam prevention | Nav: "Learn" |
| **Hub** | `pages/hub.html` | Deep-dive learning tracks: Money & Banking, AI, Crypto, Entrepreneurship, Tech Jobs | Nav: "Hub" |
| **Watch** | `pages/watch.html` | Featured YouTube content + TLM Radio links | Nav: "Watch" |
| **Feed** | `pages/feed.html` | Unified social timeline (YouTube, LinkedIn, Instagram, X, Spotify) | Nav: "Feed" |
| **Radio** | `pages/radio.html` | Dedicated TLM Radio page with podcast episodes | Watch page or Nav |
| **Media** | `pages/media.html` | Press kit, official social links, annual reports, contact | Nav: "Media" |

### Special Features

**🎯 Freedom Plan Panel** (Available on Every Page)
- 60-second quiz that generates a starter 72-hour plan
- Click "Generate planner" button or add `#fpp` to any URL
- Auto-saves and carries over to the full planner
- Implemented via `src/freedom-plan-panel.js`

### Legal & Compliance

| Page | Path | Purpose |
|------|------|---------|
| Privacy Policy | `pages/privacy.html` | GDPR/CCPA compliance, data handling |
| Terms of Service | `pages/terms.html` | Usage terms and conditions |
| Data Deletion | `pages/data-deletion.html` | How to delete your data (OAuth requirement) |

### Admin & Utility Pages

| Page | Path | Purpose | Access |
|------|------|---------|--------|
| **Admin Panel** | `pages/admin.html` | Password-gated owner dashboard: brand, resources, users, analytics, deploy controls | Hidden — 7-click logo, type "TLMadmin", or Konami code |
| Forms | `pages/forms.html` | Form templates and components | Direct link |
| Presentation | `pages/present.html` | Presentation viewer | Direct link |
| Self-Running Presentation | `pages/self-running-presentation.html` | Auto-playing pitch deck | Direct link |

### Navigation Flow

```
┌─────────────┐
│  index.html │  Landing Page
│   (Home)    │
└──────┬──────┘
       │
       ├──────────────┬──────────────┬──────────────┬──────────────┬──────────────┐
       ▼              ▼              ▼              ▼              ▼              ▼
   planner.html   learn.html     hub.html      watch.html    feed.html     media.html
   (90-day plan)  (Lessons)   (Deep tracks)    (Videos)     (Social)      (Press kit)
       │
       ├──> plan.html (Read-only view)
       │
       └──> Freedom Plan Panel (Available on ALL pages via bottom sheet)
```

---

## Architecture (no build step)

Plain HTML, CSS, and vanilla JavaScript. No bundler, no React, no transpiler.

```
.
├── index.html              Landing page
├── manifest.json           PWA manifest
├── service-worker.js       Stale-while-revalidate cache (v20+)
├── _headers                Netlify security headers + CSP
├── netlify.toml            Netlify build config (no build, just publish)
├── package.json            Project metadata
├── README.md               This file
├── pages/                  All HTML pages
│   ├── planner.html        Macro 90-day planner (the deep one)
│   ├── plan.html           Read-only inline plan view
│   ├── admin.html          Owner panel (password-gated, hashed, lockout-protected)
│   ├── learn.html          Plain-language finance lessons
│   ├── hub.html            Learning tracks hub
│   ├── watch.html          Video content
│   ├── feed.html           Social media timeline
│   ├── radio.html          TLM Radio
│   ├── media.html          Press kit & official socials
│   ├── privacy.html        Privacy policy
│   ├── terms.html          Terms of service
│   ├── data-deletion.html  Data deletion policy
│   ├── forms.html          Forms page
│   ├── present.html        Presentation page
│   └── self-running-presentation.html  Self-running presentation
├── scripts/                Build & deployment scripts
│   ├── validate.mjs        JSON validation & required-file checks
│   ├── setup.bat           Project setup
│   ├── deploy.bat          Deployment script
│   ├── dev.bat             Development server
│   ├── netlify-deploy.bat  Netlify deployment
│   ├── push-to-github.bat  Git push automation
│   ├── copy-zip-to-clipboard.bat  Zip to clipboard
│   ├── build-presentation-zip.ps1  Build presentation package
│   └── make-lovable-zip.bat  Create lovable zip
├── presentations/          Presentation files
│   ├── TLM-Finance-Pitch-Today.pptx      Main pitch deck
│   ├── TLM-Finance-Presentation.pptx     Alternative presentation
│   └── presentation-data.json            Presentation configuration
├── dist/                   Build outputs & archives
│   ├── tlm-finance-deploy.zip   Deployment package
│   └── tlm-finance-lovable.zip  Lovable package
├── netlify/functions/      Netlify serverless functions
│   ├── chat.js             OpenRouter relay for the chatbot (requires OPENROUTER_API_KEY)
│   ├── notify.js           Admin email/SMS notifications (optional: RESEND_API_KEY, TWILIO_*)
│   ├── newsletter.js       Newsletter subscriber management (requires RESEND_API_KEY)
│   ├── sync.js             Neon database sync (optional: NEON_DATABASE_URL, SYNC_ENABLED)
│   ├── voice.js            ElevenLabs text-to-speech (optional: ELEVENLABS_API_KEY)
│   └── package.json        Function dependencies
├── assets/                 Static assets
│   ├── icons/              Favicon + PWA icons + 1024×1024 app icon
│   └── social/             og-image + og-square
├── src/                    JavaScript modules & styles
│   ├── tlm-config.js                Runtime config (Supabase URL + anon key - hardcoded, no .env needed)
│   ├── auth.js                      Supabase email + Google + Facebook OAuth
│   ├── app.js                       Macro Planner Pro + advanced wizard
│   ├── freedom-plan-panel.js        Shared bottom-sheet FPP — runs on every page
│   ├── chatbot.js                   Floating AI helper, multi-LLM rotation
│   ├── admin-overrides.js           Three discreet admin entry methods + page-hide
│   ├── contact-gate.js              (Neutralized — only fires when admin flag is on)
│   ├── theme-toggle.js              Dark/light mode toggle
│   ├── mile-high-club.js            Special feature module
│   ├── styles/
│   │   ├── globals.css              Charcoal/gold theme, Planner Pro CSS, FPP, a11y
│   │   └── print.css                Print layout with URL citations
│   ├── utils/
│   │   ├── storage.js               localStorage adapter + plan schema
│   │   ├── budgetCalculator.js      Pure totals / risk-flag math
│   │   └── exportPlan.js            JSON / CSV / mailto / Web Share / print
│   └── data/
│       ├── resources.json           25+ vetted reentry resources
│       ├── people.json              Founder / leadership / alumni cards
│       ├── tlmStats.json            Impact metrics with year + citation
│       └── media.json               Official YouTube / LinkedIn / IG / X / press kit
└── docs/                   Documentation
    ├── README_FOR_DAD.md            User-friendly walkthrough
    ├── TLM-Finance-Pitch-Voiceover-Script.md  Voiceover script
    ├── supabase-bootstrap.sql       SQL: tlm_subscribers + tlm_audit + tlm_plans + RLS
    ├── SUPABASE_QUICKSTART.md       Supabase setup guide
    ├── SETUP_NOTES.md               Setup notes
    ├── QA_CHECKLIST.md              Quality assurance checklist
    ├── NEON_SYNC.md                 Neon sync documentation
    └── research/
        ├── TLM_RESEARCH.md          Research notes
        ├── SOURCE_MAP.json          Every cited URL + last-checked date
        └── CONTENT_TODO.md          Permission/photo/legal items still open
```

---

## Features

**Auth (optional — opt-in for cloud-sync only).** Supabase project `oaioqiydnrpgwbflhnba`. Three sign-in methods all live: email + password, Google OAuth, Facebook OAuth (developer mode). Tables: `tlm_subscribers`, `tlm_audit`, `tlm_plans` — all behind Row-Level Security. The site is **fully usable signed-out**; sign-in is only required when the user wants to push their plan to the cloud.

**Macro Planner Pro.** 7 steps with visual icon stepper, ~50 smart suggestion chips, 4 quick-start templates ("Just released, no income yet" / "Working part-time" / "School + side hustle" / "Family support setup"), currency-formatted inputs (`Intl.NumberFormat`), goals with ETA calculation, document grid with progress bar, sequence cards with checkbox strikethrough, plan-health score (0–100), color-coded cash-flow ratio, smart contextual tips, "I don't have any" acknowledgment toggles, debounced cloud-sync to Supabase with a live `role="status"` sync pill ("Saved on this device" / "Saving to cloud…" / "Synced · 3:41 PM").

**Freedom Plan Panel — bottom-sheet, every page.** A 60-second quiz that builds a starter 72-hour plan from selected need-cards (Money plan, ID & docs, Job path, Housing, Education, Transportation, Health & meds, Family support). Self-injecting via `src/freedom-plan-panel.js` on every page. Auto-opens on `#fpp` URL hash. Suggests upgrading to the customizable plan (`./planner.html`).

**Admin panel.** Hashed password gate (SHA-256 + per-install salt) with brute-force lockout (5 wrong tries → 5-minute timeout). Three discreet entry methods that route through the gate: 7-click logo within 3s, type `TLMadmin` anywhere, Konami code (↑↑↓↓←→←→ B A). Plus legacy `Ctrl/Cmd+Shift+A` and `#admin` URL hash. Tabs: brand / hero / impact stats / resources CRUD / videos / people / sign-ins & subscribers (Supabase + local merge) / audit log / pages-visibility (12-page list) / feature toggles / privacy / deploy / export & reset.

**Chatbot — multi-LLM rotation.** Floating widget, no key in the page, no analytics. Routes through `/.netlify/functions/chat` which rotates 13 free models (Llama-3.3-70B, DeepSeek-V3, DeepSeek-R1, Qwen-2.5-72B, Qwen-QwQ, Gemini 2.0 Flash, Hermes-3-405B, Nemotron-70B, Gemma-2-9B, Phi-3, Mistral, OpenChat, Llama-3.2-3B). Falls over to four no-key Pollinations endpoints (OpenAI, Mistral, Llama variants), and finally to HuggingFace Inference for Mistral-7B. Topic guards (parole / probation / immigration / custody → declines and redirects to NRRC, Root & Rebound, 211).

**PWA / offline.** Manifest with five home-screen shortcuts. Service worker `paving-the-road-v20` caches the shell (HTML, CSS, JS, JSON, icons) including all 15 pages, the auth + admin scripts, the FPP module, the legal pages, and the data files. Stale-while-revalidate fetch.

**Privacy posture.** No analytics, no third-party fonts. CSP enforced via `_headers` (default-src self; explicit allowlist for Supabase, esm.sh, Pollinations, HuggingFace, YouTube, Spotify, SoundCloud, Google + Facebook OAuth). Plan stays in localStorage by default; Supabase is opt-in via sign-in.

**Accessibility.** WCAG 2.1 AA pass on the Planner Pro additions (April 2026): real `role="progressbar"` + `aria-valuenow` on progress bars, `aria-current="step"` on the active stepper button, `aria-live="polite"` + `role="status"` on the sync pill so SR announces state changes, decorative emoji `aria-hidden`, `:focus-visible` rings on every chip / step / template / button, dark-mode contrast bumps for `--tlm-gold-deep` text. Auth modal has `role="dialog"` + `aria-modal` + autofocus. Reduced-motion overrides on every animation.

---

## Run locally

No build step.

```bash
# Quick — Python
python3 -m http.server 8080
# open http://localhost:8080

# Or Node
npx serve .
```

Service workers register on HTTPS or `localhost`. Opening `index.html` by double-click works for layout but disables offline mode.

---

## Deploy

Production is on Netlify and tracked in the GitHub Action `.github/workflows/deploy.yml`.

```bash
# Easiest — Netlify drag-drop
# https://app.netlify.com/drop  →  drag the project folder.

# CLI
netlify deploy --prod --dir=.

# Validate JSON / required-pages first
node scripts/validate.mjs
```

Manual: every push to `main` triggers `validate.mjs`, then deploys. PRs get a preview URL posted as a comment.

---

## Scripts

This project includes several helper scripts for development, validation, and deployment.

### Recommended Git Workflow

**macOS/Linux:**
```bash
./scripts/commit-and-push.sh
```

**Windows:**
```cmd
scripts\commit-and-push.bat
```

These scripts provide:
- Interactive prompts for commit messages
- Shows changes before committing
- Confirmation before pushing
- Never force pushes (safe for daily use)

### Other Scripts

| Script | Purpose |
|--------|---------|
| `scripts/validate.mjs` | Validates JSON files and checks for required files |
| `scripts/dev.bat` | Starts local development server (Windows) |
| `scripts/deploy.bat` | Deployment script (Windows) |
| `scripts/netlify-deploy.bat` | Netlify deployment (Windows) |
| `scripts/build-presentation-zip.ps1` | Builds presentation package |

**📖 Full documentation:** See [`scripts/README.md`](./scripts/README.md) for complete usage instructions and best practices.

---

## Environment Variables

### Required for Local Development: NONE ✅

The site works **completely standalone** with no environment variables! Supabase credentials are in `src/tlm-config.js` (safe for public repos - it's the anon key with Row-Level Security).

### Optional - Netlify Functions (Server-Side Only)

These environment variables are **only needed on Netlify** for serverless functions. Set them in **Netlify Dashboard → Site Settings → Environment Variables**.

| Variable | Function | Required? | Purpose |
|----------|----------|-----------|---------|
| `OPENROUTER_API_KEY` | `chat.js` | **Yes** (for chatbot) | API key from [openrouter.ai/keys](https://openrouter.ai/keys) - enables AI chatbot |
| `RESEND_API_KEY` | `notify.js`, `newsletter.js` | Optional | Email notifications and newsletter ([resend.com](https://resend.com)) |
| `TWILIO_ACCOUNT_SID` | `notify.js` | Optional | SMS notifications (Twilio account SID) |
| `TWILIO_AUTH_TOKEN` | `notify.js` | Optional | SMS notifications (Twilio auth token) |
| `TWILIO_FROM_NUMBER` | `notify.js` | Optional | SMS notifications (Twilio phone number) |
| `NEON_DATABASE_URL` | `sync.js` | Optional | Neon Postgres database URL for syncing |
| `SYNC_ENABLED` | `sync.js` | Optional | Set to `"true"` to enable Neon sync |
| `ELEVENLABS_API_KEY` | `voice.js` | Optional | Text-to-speech API key ([elevenlabs.io](https://elevenlabs.io)) |
| `ELEVENLABS_VOICE_ID` | `voice.js` | Optional | ElevenLabs voice ID (defaults to built-in) |
| `ELEVENLABS_MODEL_ID` | `voice.js` | Optional | ElevenLabs model ID (defaults to built-in) |
| `NETLIFY_API_TOKEN` | `newsletter.js` | Auto-set | Netlify automatically provides this |
| `NETLIFY_SITE_ID` | `newsletter.js` | Auto-set | Netlify automatically provides this |

**💡 Quick Start:**
- Site works locally with **zero configuration**
- Only add `OPENROUTER_API_KEY` on Netlify if you want the chatbot
- All other functions degrade gracefully if keys are missing

---

## Auth setup (one-time, already done in production)

See [`docs/SUPABASE_QUICKSTART.md`](./docs/SUPABASE_QUICKSTART.md) for the full walkthrough. Summary:

1. Create Supabase project, run [`docs/supabase-bootstrap.sql`](./docs/supabase-bootstrap.sql).
2. URL Configuration → site URL `tlmfinance.netlify.app`, redirect URLs include `localhost:3000`.
3. Google Cloud OAuth client → paste Client ID + Secret into Supabase Google provider.
4. Facebook Developer App → paste App ID + Secret into Supabase Facebook provider; redirect URI is the Supabase auth callback.
5. Paste the Supabase URL + anon key into [`src/tlm-config.js`](./src/tlm-config.js).

---

## Status & open punch list

**Done.**
- ✅ Macro Planner Pro reinvention (chips, templates, plan-health score, cloud sync)
- ✅ Inline read-only `pages/plan.html` + Save Progress button
- ✅ Dedicated `pages/planner.html` page; `index.html` is a landing CTA card
- ✅ Freedom Plan Panel as universal bottom-sheet (every page)
- ✅ Email + Google + Facebook OAuth via Supabase
- ✅ Privacy + Terms + Data-deletion legal pages in `pages/`
- ✅ Admin panel with hashed-password gate + brute-force lockout
- ✅ WCAG 2.1 AA accessibility audit applied
- ✅ CSP headers via `_headers`
- ✅ Service-worker SHELL fully populated, version v20
- ✅ Chatbot multi-LLM rotation refreshed for 2026
- ✅ Project reorganized into logical directories (pages/, scripts/, presentations/, dist/, docs/)

**Still on the list.**
- Facebook is in **developer mode** only — Live mode requires Meta business verification + App Review.
- TLM logo / portraits still placeholder pending written permission from `info@thelastmile.org`.
- Legal disclaimer in the footer needs an attorney review before public launch.
- Quarterly link audit on every URL in `resources.json` and `SOURCE_MAP.json`.

---

## What this project does *not* do

- It's a **planning tool**, not legal, financial, or case-management advice.
- It does not run analytics or fingerprint visitors.
- It does not auto-sync your plan to the cloud unless you sign in.
- It does not include the official TLM logo or photos until permission is in writing.
- It does not execute trades, place orders, or move money on your behalf.

---

## Sources

Every fact on the site cites its source inline. Full inventory in [`docs/research/SOURCE_MAP.json`](./docs/research/SOURCE_MAP.json). Highlights:

- The Last Mile — [home](https://thelastmile.org/), [reentry](https://thelastmile.org/programs/reentry/), [team](https://thelastmile.org/about/team/), [students](https://thelastmile.org/students/), [press kit](https://thelastmile.org/press-kit/), [2024 Annual Report (PDF)](https://thelastmile.org/wp-content/uploads/2025/03/2024AnnualReport.pdf), [The Last Mile in 2026](https://thelastmile.org/the-last-mile-in-2026/).
- Project Rebound — [CSUF](https://www.fullerton.edu/rebound/), [CSU System](https://www.calstate.edu/csu-system/news/Pages/Project-Rebound.aspx).
- CFPB — [Your Money, Your Goals: Focus on Reentry](https://www.consumerfinance.gov/consumer-tools/educator-tools/your-money-your-goals/companion-guides/).
- FDIC — [Money Smart for Adults](https://www.fdic.gov/consumer-resource-center/money-smart-adults).
- National Reentry Resource Center — [home](https://nationalreentryresourcecenter.org/).
- DOL — [Reentry Employment Opportunities](https://www.dol.gov/agencies/eta/reentry).
- Official TLM channels — [YouTube](https://www.youtube.com/@TheLastMile), [LinkedIn](https://www.linkedin.com/company/the-last-mile), [Instagram](https://www.instagram.com/thelastmileorg/), [X](https://twitter.com/TLM).

---

## License & attribution

Planning companion released as-is. The Last Mile name, logo, and likenesses belong to The Last Mile. Project Rebound name and logo belong to the CSU System / John Irwin / CSUF. CFPB, FDIC, DOL, and other federal materials are public works of the U.S. Government.
