# QA Checklist — Paving the Road

> Run before deploying or sharing publicly. Manual + automated checks. Mark each `pass` / `fail` / `n/a`.

## Build & boot
- [ ] `index.html` opens locally with no console errors (file:// or http://).
- [ ] `media.html` opens with no console errors.
- [ ] `service-worker.js` registers (look for "ServiceWorker registration successful" in DevTools).
- [ ] `manifest.json` validates in Chrome → DevTools → Application → Manifest.

## Visual / theme
- [ ] TLM-inspired theme colors render: charcoal (#1A1A1A), gold (#F5B51B), warm light (#FFF8E6).
- [ ] Hero sunrise + animated road lane visible on first paint.
- [ ] Reveal-on-scroll animations fire.
- [ ] No emoji or imagery the user did not request.

## Mobile (≤480px)
- [ ] No horizontal scroll on iPhone SE / Pixel sizes.
- [ ] Bottom nav visible with safe-area padding on iOS.
- [ ] Tap targets are ≥ 44px.
- [ ] Hero stack vertical; CTAs fit one column.
- [ ] Plan panel slides up smoothly.
- [ ] Swipe-up on the road opens the plan panel.

## Tablet & desktop
- [ ] 720px+ layouts switch to two columns.
- [ ] 980px+ shows full 3-up resource grid.
- [ ] Sticky header is readable; backdrop blur falls back gracefully.

## Planner
- [ ] Add/remove rows in Income, Benefits, Expenses, Debts, Goals.
- [ ] Documents checklist seeds defaults; checking persists across reload.
- [ ] 72-hour / 30 / 60 / 90-day plans accept new entries.
- [ ] Live KPIs update on every keystroke.
- [ ] Risk flags appear when net cash flow is negative or transit/phone are missing.
- [ ] Refresh page → plan reloads from `localStorage`.

## Freedom Plan Panel
- [ ] Opens via top-bar button, hero "Build My Plan", sunrise/road click, mile markers, mobile swipe-up, and bottom-nav "Quick plan".
- [ ] Quiz toggles persist.
- [ ] "Generate my 72-hour plan" creates tasks tied to selected needs.
- [ ] Confetti triggers (and is disabled under reduced-motion).

## Export / save / share
- [ ] Print view collapses to one column with URL citations.
- [ ] Save-to-phone uses Web Share where available; print fallback otherwise.
- [ ] JSON export downloads a valid file.
- [ ] CSV export opens cleanly in Excel / Google Sheets.
- [ ] Copy-to-clipboard puts the plan summary in the clipboard.
- [ ] Share button uses `navigator.share` on mobile.
- [ ] "Send to case manager" produces a `mailto:` draft (no auto-send).

## Media page
- [ ] All YouTube tiles use the click-to-play facade.
- [ ] Each social card links to the correct verified handle.
- [ ] Press kit / annual report links open.

## Privacy
- [ ] No network calls outside `thelastmile.org`, `youtube.com`, `youtube-nocookie.com`, and the user's chosen actions.
- [ ] No cookies set on first load.
- [ ] No third-party fonts or analytics bundled.
- [ ] No localStorage written before first interaction.

## Accessibility
- [ ] Keyboard-only flow works for nav, planner, and the panel.
- [ ] Focus rings visible on all interactive elements.
- [ ] All buttons/links have meaningful accessible names.
- [ ] `prefers-reduced-motion` disables animation and confetti.
- [ ] Headings descend H1 → H2 → H3 without skipping.
- [ ] Color contrast passes WCAG AA (verified with axe DevTools / Lighthouse).
- [ ] Screen reader (VoiceOver / TalkBack) announces hero, sections, and panel correctly.

## Content / sources
- [ ] Every stat in the Impact section shows a year and source link.
- [ ] Every resource card shows source + last-checked date.
- [ ] No people are pictured without permission.
- [ ] Disclaimer present in the planner panel and footer.

## Deployment
- [ ] Site works on a static host (Netlify drop, GitHub Pages, Vercel static).
- [ ] Service worker registers over HTTPS only.
- [ ] PWA "Add to Home Screen" works on iOS Safari and Android Chrome.
