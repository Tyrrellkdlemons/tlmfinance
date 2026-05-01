# The Last Mile · Finance — Paving the Road

> A free, private, mobile-first reentry planning companion **inspired by The Last Mile**. Build a real money plan, track documents, and find vetted resources for the first 72 hours, 30 / 60 / 90 days after release.
>
> **Live site:** [tlmfinance.netlify.app](https://tlmfinance.netlify.app)
> **Repo:** [github.com/Tyrrellkdlemons/tlmfinance](https://github.com/Tyrrellkdlemons/tlmfinance)

This project is **not officially affiliated with The Last Mile** unless TLM grants explicit permission. Brand language uses "inspired by" and the official TLM logo isn't used until permission is in writing.

For the full product walkthrough — written for non-engineers — see **[`README_FOR_DAD.md`](./README_FOR_DAD.md)**.

---

## Pages

| Page | Purpose |
|---|---|
| `index.html` | Landing — hero, Freedom Plan Panel teaser, "Open the customizable plan" CTA card, impact, resources, Project Rebound. |
| `planner.html` | **Macro core feature** — the full 90-day money planner (income / benefits / expenses / debts / goals / documents / 72h–90d). Plan-health score, smart suggestion chips, quick-start templates, cloud sync. |
| `plan.html` | Read-only inline view of your plan — works mid-progress. Print, share, export, Save Progress, "Continue editing." |
| `learn.html` | Plain-language lessons on banking, credit, savings, money apps, crypto, AI tools, tech careers, scam avoidance. |
| `hub.html` | Deeper learning tracks: Money & Banking · AI · Crypto · Entrepreneurship · Study Anything · Modern Tech Jobs. |
| `feed.html` | Unified social timeline — TLM site, YouTube, LinkedIn, IG, FB, X, Spotify, SoundCloud. Filterable. |
| `watch.html` | Featured YouTube tiles + TLM Radio links. |
| `radio.html` | Dedicated TLM Radio page. |
| `media.html` | Press kit, official socials, annual reports, press contact. |
| `privacy.html`, `terms.html`, `data-deletion.html` | Compliance pages required by Google + Facebook OAuth review. |
| `admin.html` | **Hidden, password-gated** owner panel — brand / hero / resources / videos / people / users / audit log / pages-visibility / deploy. |

The Freedom Plan Panel (60-second micro-quiz that prints a starter 72-hour plan) is a **bottom-sheet that pops up on every page** via the shared `src/freedom-plan-panel.js` module.

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
│   ├── chat.js             OpenRouter relay for the chatbot
│   ├── notify.js           Admin email pings on sign-up
│   └── newsletter.js       Newsletter subscriber capture
├── assets/                 Static assets
│   ├── icons/              Favicon + PWA icons + 1024×1024 app icon
│   └── social/             og-image + og-square
├── src/                    JavaScript modules & styles
│   ├── tlm-config.js                Runtime config (Supabase URL + anon key)
│   ├── auth.js                      Supabase email + Google + Facebook OAuth
│   ├── app.js                       Macro Planner Pro + advanced wizard
│   ├── freedom-plan-panel.js        Shared bottom-sheet FPP — runs on every page
│   ├── chatbot.js                   Floating AI helper, multi-LLM rotation
│   ├── admin-overrides.js           Three discreet admin entry methods + page-hide
│   ├── contact-gate.js              (Neutralized — only fires when admin flag is on)
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

**PWA / offline.** Manifest with five home-screen shortcuts. Service worker `paving-the-road-v15` caches the shell (HTML, CSS, JS, JSON, icons) including all 13 pages, the auth + admin scripts, the FPP module, the legal pages, and the data files. Stale-while-revalidate fetch.

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
- Macro Planner Pro reinvention (chips, templates, plan-health score, cloud sync)
- Inline read-only `plan.html` + Save Progress button
- Dedicated `planner.html` page; `index.html` is a landing CTA card
- Freedom Plan Panel as universal bottom-sheet (every page)
- Email + Google + Facebook OAuth via Supabase
- Privacy + Terms + Data-deletion legal pages
- Admin panel with hashed-password gate + brute-force lockout
- WCAG 2.1 AA accessibility audit applied
- CSP headers via `_headers`
- Service-worker SHELL fully populated, version v15
- Chatbot multi-LLM rotation refreshed for 2026

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
