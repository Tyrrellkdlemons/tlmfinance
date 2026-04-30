/* =====================================================================
   THEME TOGGLE — sitewide light / dark / auto cycler.
   - Reads localStorage[tlm:theme:v1]: "auto" | "light" | "dark".
   - Applies via <html data-theme="..."> for CSS to override
     prefers-color-scheme rules.
   - Pre-applies in <head> via tlm-theme-init (separate inline snippet
     in each page) to prevent flash of wrong theme.
   - Injects a small button into the .nav__cta of every page.
   ===================================================================== */
(function () {
  'use strict';
  if (window.__tlmThemeLoaded) return;
  window.__tlmThemeLoaded = true;

  const KEY = 'tlm:theme:v1';
  const ORDER = ['auto', 'light', 'dark'];
  const ICON  = { auto: '🌓', light: '☀️', dark: '🌙' };
  const LABEL = { auto: 'Auto · follow system', light: 'Light mode', dark: 'Dark mode' };

  function getTheme() {
    try { const v = localStorage.getItem(KEY); return ORDER.includes(v) ? v : 'auto'; }
    catch { return 'auto'; }
  }
  function setTheme(t) {
    try { localStorage.setItem(KEY, t); } catch {}
    document.documentElement.dataset.theme = t;
    // Update meta theme-color for the browser chrome on mobile
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      const dark = (t === 'dark') || (t === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
      meta.setAttribute('content', dark ? '#0E0E0E' : '#FAF7EE');
    }
    refreshButton();
  }

  function refreshButton() {
    const btn = document.getElementById('tlmThemeBtn');
    if (!btn) return;
    const t = getTheme();
    btn.dataset.theme = t;
    btn.setAttribute('aria-label', LABEL[t]);
    btn.setAttribute('title', 'Theme · ' + LABEL[t] + ' (click to cycle)');
    btn.querySelector('.tlm-theme__ic').textContent = ICON[t];
  }

  function inject() {
    if (document.getElementById('tlmThemeBtn')) return;
    const cta = document.querySelector('.nav__cta');
    const btn = document.createElement('button');
    btn.id = 'tlmThemeBtn';
    btn.type = 'button';
    btn.className = 'tlm-theme';
    btn.innerHTML = '<span class="tlm-theme__ic" aria-hidden="true">🌓</span><span class="tlm-theme__lbl">Theme</span>';
    btn.addEventListener('click', () => {
      const cur = getTheme();
      const next = ORDER[(ORDER.indexOf(cur) + 1) % ORDER.length];
      setTheme(next);
      // brief visual confirmation
      btn.classList.add('is-tap'); setTimeout(() => btn.classList.remove('is-tap'), 220);
    });
    if (cta) {
      cta.insertBefore(btn, cta.firstChild);
    } else {
      // pages without nav__cta (e.g. compliance) — slip into the .nav__inner
      const inner = document.querySelector('.nav__inner');
      if (inner) inner.appendChild(btn);
    }
    refreshButton();
  }

  // Apply stored theme immediately
  setTheme(getTheme());

  // Listen for OS-level theme changes when in auto mode
  try {
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (getTheme() === 'auto') setTheme('auto'); // re-pulse meta theme-color
    });
  } catch {}

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', inject);
  else inject();

  // Public API
  window.TLMTheme = { get: getTheme, set: setTheme };
})();
