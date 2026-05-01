/**
 * admin-overrides.js — runs early on every page.
 *  1. Applies admin panel overrides from localStorage (brand, hero, stats,
 *     hidden pages, feature toggles).
 *  2. Three discreet ways to open the admin panel:
 *       a) Click the brand logo 7 times within 3 seconds
 *       b) Type the secret string "TLMadmin" anywhere on the page
 *       c) Konami code: ↑ ↑ ↓ ↓ ← → ← → b a
 *     (plus legacy URL hash #admin and Ctrl/Cmd+Shift+A still work)
 *  3. Page-hide enforcement — if admin marked the current page hidden,
 *     redirect to the home page (admin can always view).
 *
 * Storage key: tlm:admin:v1
 */
(function adminAccess() {
  const goAdmin = () => { location.href = './pages/admin.html'; };

  // Legacy hash trigger
  if (location.hash === '#admin') goAdmin();

  // Wait for DOM
  const ready = (fn) => document.readyState !== 'loading'
    ? fn() : document.addEventListener('DOMContentLoaded', fn);

  ready(() => {
    // a) 7 clicks on the brand within 3 seconds
    const brand = document.querySelector('.brand');
    if (brand) {
      let clicks = 0, timer = null;
      brand.addEventListener('click', (e) => {
        clicks++;
        clearTimeout(timer);
        if (clicks >= 7) { e.preventDefault(); clicks = 0; goAdmin(); return; }
        timer = setTimeout(() => { clicks = 0; }, 3000);
      });

      // Long-press (1.4s) for touch — kept as backup
      let pressTimer = null;
      const start = () => { pressTimer = setTimeout(() => goAdmin(), 1400); };
      const cancel = () => { clearTimeout(pressTimer); pressTimer = null; };
      brand.addEventListener('touchstart', start, { passive: true });
      brand.addEventListener('touchend', cancel);
      brand.addEventListener('touchmove', cancel);
      brand.addEventListener('touchcancel', cancel);
    }

    // b) Type "TLMadmin" anywhere — global keystroke listener
    const SECRET = 'TLMadmin';
    let buf = '';
    document.addEventListener('keydown', (e) => {
      // ignore when typing in form fields
      const t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (e.key && e.key.length === 1) {
        buf = (buf + e.key).slice(-SECRET.length);
        if (buf === SECRET) { buf = ''; goAdmin(); }
      }
    });

    // c) Konami code: ↑ ↑ ↓ ↓ ← → ← → b a
    const KONAMI = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
    let kBuf = [];
    document.addEventListener('keydown', (e) => {
      kBuf.push(e.key); if (kBuf.length > KONAMI.length) kBuf.shift();
      if (kBuf.length === KONAMI.length && kBuf.every((k,i) => k === KONAMI[i])) {
        kBuf = []; goAdmin();
      }
    });

    // Legacy keyboard shortcut still works
    document.addEventListener('keydown', (e) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.shiftKey && (e.key === 'A' || e.key === 'a')) { e.preventDefault(); goAdmin(); }
    });
  });
})();

// Page-hide enforcement — admin can hide any non-admin page.
(function pageHide() {
  try {
    const cfg = JSON.parse(localStorage.getItem('tlm:admin:v1') || '{}');
    const hidden = Array.isArray(cfg.hiddenPages) ? cfg.hiddenPages : [];
    const file = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    if (file === 'admin.html') return;
    if (hidden.map(s => String(s).toLowerCase()).includes(file)) {
      // Allow admin override via ?adminview=1 query
      if (!location.search.includes('adminview=1')) {
        location.replace('./index.html');
      }
    }
  } catch {}
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
