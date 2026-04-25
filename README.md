# Paving the Road

> A free, private, mobile-first reentry planning companion **inspired by The Last Mile**. Build a real money plan, track documents, and find vetted resources for the first 72 hours, 30, 60, and 90 days after release.

This is **not affiliated with The Last Mile** unless TLM grants explicit permission. Brand language uses "inspired by," and the official TLM logo is **not** used until permission is in writing. See [`docs/research/CONTENT_TODO.md`](./docs/research/CONTENT_TODO.md).

---

## What's in the box

```
.
├── index.html                  Main site (hero, planner, resources, stories, impact, Project Rebound)
├── media.html                  Dedicated TLM media page (YouTube + LinkedIn + Instagram + X + press)
├── manifest.json               PWA manifest
├── service-worker.js           Offline shell cache
├── assets/icons/               Favicon + PWA icons (192/512 PNG, SVG mark)
├── src/
│   ├── app.js                  Main app — wires all sections, planner, panel, confetti
│   ├── styles/
│   │   ├── globals.css         TLM-inspired theme, mobile-first, reduced-motion friendly
│   │   └── print.css           Clean print layout with URL citations
│   ├── utils/
│   │   ├── storage.js          localStorage adapter + plan schema
│   │   ├── budgetCalculator.js Pure totals / risk-flag math
│   │   └── exportPlan.js       JSON / CSV / mailto / Web Share / print
│   └── data/
│       ├── resources.json      Vetted reentry resources (sourced + dated)
│       ├── people.json         Sourced founder / leadership / alumni cards
│       ├── tlmStats.json       Impact metrics with year + citation
│       └── media.json          Official YouTube / LinkedIn / IG / X / press kit
└── docs/
    ├── research/
    │   ├── TLM_RESEARCH.md     Source-grounded research notes
    │   ├── SOURCE_MAP.json     Every cited URL + last-checked date
    │   └── CONTENT_TODO.md     Permission/photo/legal items still open
    └── QA_CHECKLIST.md         Pre-deploy QA pass
```

---

## Run locally

The site is plain HTML/CSS/JS — **no build step required.**

### Option A — quick (Python)
```bash
cd "The Last Mile (TLM)"
python3 -m http.server 8080
# open http://localhost:8080
```

### Option B — Node
```bash
npx serve .
```

### Option C — VS Code Live Server
Right-click `index.html` → "Open with Live Server".

> Service workers require HTTP(S), not `file://`. If you double-click `index.html`, the page works but offline mode and PWA install will be disabled.

---

## Deploy

Pick whichever you're comfortable with — none require a build step.

### Netlify (easiest)
1. Go to [app.netlify.com/drop](https://app.netlify.com/drop).
2. Drag the **`The Last Mile (TLM)`** folder onto the drop zone.
3. Done — Netlify gives you an `https://...netlify.app` URL.

### GitHub Pages
1. Push the folder contents to a new repo (e.g. `paving-the-road`).
2. Repo → Settings → Pages → "Deploy from a branch" → `main` / `/ (root)` → Save.
3. Wait ~1 min, your site is at `https://<you>.github.io/paving-the-road/`.

### Vercel
1. `npx vercel` from the project root, follow prompts. No build command needed.

### Any static web host
Upload all files to the host's web root via SFTP / S3 / Cloud Storage. Make sure `.html`, `.css`, `.js`, and `.json` are served with their proper MIME types and that the site is on HTTPS so the service worker can register.

---

## What's already done

- TLM-inspired theme (charcoal / gold / warm light), sunrise hero, animated road, mile-marker easter eggs, Freedom Plan Panel.
- 7-step financial planner with live KPIs, risk flags, debt-priority sort, save / print / JSON / CSV / Web Share / mailto / clipboard.
- Resource hub (filterable) with 25+ vetted reentry resources, every card source-attributed and date-stamped.
- People / Stories cards (founders, ED, alumni) with sourced summaries and silhouette placeholders (photos require permission).
- Project Rebound (CSUF + system-wide) education-pathway section.
- Impact section pulled from the TLM 2024 Annual Report and 2026 outlook, every metric labeled with year + source link.
- Dedicated **Media page** (`media.html`) integrating the official **[@TheLastMile YouTube channel](https://www.youtube.com/@TheLastMile)**, plus LinkedIn, Instagram, X/Twitter, press kit, and annual reports.
- PWA: installable, offline shell cache, mobile bottom nav with iOS safe-area padding, Web Share, print stylesheet.
- Reduced-motion support, focus rings, semantic HTML, skip link, plain-language copy.
- Local-only persistence — your plan never leaves the device unless you export it.

---

## What still needs you (manual steps)

1. **TLM logo & photo permission.** Use the [TLM Press Kit](https://thelastmile.org/press-kit/) and email `info@thelastmile.org` before placing the official logo or any portrait.
2. **Legal disclaimer review.** The wording in the planner and footer is a starting point. Have an attorney review before public launch.
3. **Local-resource list.** Add Los Angeles / Orange County partner organizations to `src/data/resources.json` once they're confirmed.
4. **Stat refresh.** When the next TLM Annual Report drops, update `src/data/tlmStats.json` and the dates next to each metric.
5. **Accessibility audit.** Run axe DevTools and Lighthouse, fix anything the QA checklist flags.

---

## Sources used

All facts cited inline on the site link to the original source. The full inventory lives in [`docs/research/SOURCE_MAP.json`](./docs/research/SOURCE_MAP.json). Highlights:

- The Last Mile — [home](https://thelastmile.org/), [reentry](https://thelastmile.org/programs/reentry/), [team](https://thelastmile.org/about/team/), [students](https://thelastmile.org/students/), [press kit](https://thelastmile.org/press-kit/), [2024 Annual Report (PDF)](https://thelastmile.org/wp-content/uploads/2025/03/2024AnnualReport.pdf), [The Last Mile in 2026](https://thelastmile.org/the-last-mile-in-2026/).
- Stand Together — [TLM reentry feature](https://standtogether.org/stories/future-of-work/the-last-mile-prepares-incarcerated-individuals-for-reentry).
- Wikipedia — [The Last Mile (prison rehabilitation program)](https://en.wikipedia.org/wiki/The_Last_Mile_(prison_rehabilitation_program)).
- NPQ — [interview with Kevin McCracken](https://nonprofitquarterly.org/education-not-incarceration-an-interview-with-kevin-mccracken/).
- Project Rebound — [CSUF](https://www.fullerton.edu/rebound/), [CSU system](https://www.calstate.edu/csu-system/news/Pages/Project-Rebound.aspx).
- CFPB — [Your Money, Your Goals: Focus on Reentry](https://www.consumerfinance.gov/consumer-tools/educator-tools/your-money-your-goals/companion-guides/).
- FDIC — [Money Smart for Adults](https://www.fdic.gov/consumer-resource-center/money-smart-adults).
- National Reentry Resource Center — [home](https://nationalreentryresourcecenter.org/).
- DOL — [Reentry Employment Opportunities](https://www.dol.gov/agencies/eta/reentry).
- Official TLM channels — [YouTube](https://www.youtube.com/@TheLastMile), [LinkedIn](https://www.linkedin.com/company/the-last-mile), [Instagram](https://www.instagram.com/thelastmileorg/), [X](https://twitter.com/TLM).

---

## Known limitations

- This is a **planning tool**, not legal, financial, or case-management advice.
- Stats reflect the most recent verified report; numbers may shift as TLM publishes new data.
- The site is local-only by design — there is no server, account, or backup. If a user clears their browser data, the plan is lost. JSON export is the recommended backup.
- YouTube embeds use the `user_uploads` listType. If TLM changes their channel handle / structure, the tile click falls through to opening the channel in a new tab.
- Photos of leadership and alumni are intentionally absent — replace silhouettes only with explicitly licensed images.

---

## License & attribution

This planning companion is released as-is. The Last Mile name, logo, and likenesses belong to The Last Mile. Project Rebound name and logo belong to the CSU System / John Irwin / CSUF. CFPB, FDIC, DOL, and other federal materials are public works of the U.S. Government.
