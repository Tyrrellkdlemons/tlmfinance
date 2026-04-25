/**
 * admin-overrides.js — runs early on every page.
 *  1. Applies admin panel overrides from localStorage (brand, hero, stats…).
 *  2. Adds three ways to open the admin panel:
 *       a) Triple-click anywhere on the brand wordmark
 *       b) Keyboard shortcut: Ctrl/Cmd + Shift + A
 *       c) Long-press (1.4s) on the brand on touch devices
 *       d) URL hash: append #admin to any page
 *
 * Storage key: tlm:admin:v1
 */
(function adminAccess() {
  const goAdmin = () => { location.href = './admin.html'; };

  // d) Hash trigger
  if (location.hash === '#admin') goAdmin();

  // Wait for DOM
  const ready = (fn) => document.readyState !== 'loading'
    ? fn() : document.addEventListener('DOMContentLoaded', fn);

  ready(() => {
    // a) Triple-click on the brand
    const brand = document.querySelector('.brand');
    if (brand) {
      let clicks = 0, timer = null;
      brand.addEventListener('click', (e) => {
        clicks++;
        clearTimeout(timer);
        if (clicks >= 3) { e.preventDefault(); clicks = 0; goAdmin(); return; }
        timer = setTimeout(() => { clicks = 0; }, 600);
      });

      // c) Long-press (1.4s) for touch
      let pressTimer = null;
      const start = (e) => {
        pressTimer = setTimeout(() => { goAdmin(); }, 1400);
      };
      const cancel = () => { clearTimeout(pressTimer); pressTimer = null; };
      brand.addEventListener('touchstart', start, { passive: true });
      brand.addEventListener('touchend', cancel);
      brand.addEventListener('touchmove', cancel);
      brand.addEventListener('touchcancel', cancel);
    }

    // b) Keyboard shortcut
    document.addEventListener('keydown', (e) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
        e.preventDefault(); goAdmin();
      }
    });
  });
})();

(function () {
  try {
    const raw = localStorage.getItem('tlm:admin:v1');
    if (!raw) return;
    const cfg = JSON.parse(raw);
    if (!cfg || typeof cfg !== 'object') return;

    // Theme variant
    if (cfg.themeVariant) document.documentElement.dataset.theme = cfg.themeVariant;

    // Brand short name
    if (cfg.brandShort) {
      const set = () => {
        document.querySelectorAll('.brand img').forEach(img => {
          if (cfg.brandShort) img.setAttribute('alt', cfg.brandShort);
        });
      };
      if (document.readyState !== 'loading') set();
      else document.addEventListener('DOMContentLoaded', set);
    }

    // Hero copy
    const apply = () => {
      if (cfg.heroEyebrow) {
        const eb = document.querySelector('.hero .eyebrow');
        if (eb) eb.lastChild.textContent = ' ' + cfg.heroEyebrow;
      }
      if (cfg.heroH1) {
        const h1 = document.querySelector('#hero-title');
        if (h1) h1.innerHTML = cfg.heroH1;
      }
      if (cfg.heroLede) {
        const l = document.querySelector('.hero .lede');
        if (l) l.textContent = cfg.heroLede;
      }
      if (cfg.disclaimerText) {
        document.querySelectorAll('.disclaimer').forEach(d => d.textContent = cfg.disclaimerText);
      }
      // Counters
      if (cfg.statAlumni)   { const e=document.querySelector('#counter-alumni');   if (e) e.dataset.target = cfg.statAlumni; }
      if (cfg.statEmployed) { const e=document.querySelector('#counter-employed'); if (e) e.dataset.target = cfg.statEmployed; }
      if (cfg.statRecid)    { const e=document.querySelector('#counter-recid');    if (e) e.dataset.target = cfg.statRecid; }
    };
    if (document.readyState !== 'loading') apply();
    else document.addEventListener('DOMContentLoaded', apply);

    // Feature toggles
    if (cfg.disableChatbot) {
      window.__tlmChatLoaded = true; // blocks chatbot.js from initializing
    }
  } catch (e) {
    // ignore — fail open
  }
})();
