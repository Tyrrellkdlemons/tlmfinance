/**
 * auth.js — TLM Finance authentication.
 *
 * Backend: Supabase (recommended; gives email/password + Google + Apple +
 * Facebook OAuth + a Postgres user table + audit logs in one free tier).
 * Configure by adding a tiny snippet to `index.html` (or any page) before
 * this script loads:
 *
 *   <script>
 *     window.__TLM_CONFIG = {
 *       supabaseUrl: "https://YOUR-PROJECT.supabase.co",
 *       supabaseAnonKey: "YOUR-ANON-KEY"
 *     };
 *   </script>
 *
 * If the config is missing, this module quietly falls back to a
 * localStorage-only "session" — so the modal still works for testing and
 * the site never hard-fails. Sign-in via Google / Apple / Facebook
 * requires Supabase to be configured (the providers are enabled in the
 * Supabase Auth dashboard).
 *
 * Public API:
 *   window.TLMAuth.requireSignIn({ reason })  // shows modal, resolves on success
 *   window.TLMAuth.signOut()
 *   window.TLMAuth.getUser()
 *   window.TLMAuth.onChange(fn)
 *   window.TLMAuth.openSignIn()
 */
(function () {
  if (window.__tlmAuthLoaded) return;
  window.__tlmAuthLoaded = true;

  const CFG = window.__TLM_CONFIG || {};
  const HAS_SUPABASE = !!(CFG.supabaseUrl && CFG.supabaseAnonKey);

  let sb = null;        // Supabase client
  let user = null;      // current user
  const listeners = new Set();

  // ---------- helpers ----------
  function emit() { listeners.forEach(fn => { try { fn(user); } catch {} }); }
  function readLocal() {
    try { return JSON.parse(localStorage.getItem("tlm:auth:v1") || "null"); } catch { return null; }
  }
  function writeLocal(u) {
    try {
      if (u) localStorage.setItem("tlm:auth:v1", JSON.stringify(u));
      else   localStorage.removeItem("tlm:auth:v1");
    } catch {}
  }
  // Audit log — stores the last 200 events on this device. Mirrors to Supabase
  // when configured so the admin panel can pull a global view.
  function logEvent(kind, meta = {}) {
    const evt = { kind, meta, page: location.pathname, ts: new Date().toISOString() };
    try {
      const arr = JSON.parse(localStorage.getItem("tlm:auth:log") || "[]");
      arr.unshift(evt); arr.length = Math.min(arr.length, 200);
      localStorage.setItem("tlm:auth:log", JSON.stringify(arr));
    } catch {}
    if (sb && user) {
      sb.from("tlm_audit").insert({
        user_id: user.id, kind, meta, page: location.pathname
      }).then(() => {}, () => {});
    }
  }

  // ---------- Supabase loader (deferred ESM import) ----------
  async function getSb() {
    if (!HAS_SUPABASE) return null;
    if (sb) return sb;
    try {
      const m = await import("https://esm.sh/@supabase/supabase-js@2.45.4");
      sb = m.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      });
      const { data } = await sb.auth.getSession();
      if (data && data.session) {
        user = sessionToUser(data.session);
        writeLocal(user); emit();
      }
      sb.auth.onAuthStateChange((_evt, session) => {
        user = session ? sessionToUser(session) : null;
        writeLocal(user); emit();
        if (session) logEvent("signin", { provider: session.user?.app_metadata?.provider });
      });
      return sb;
    } catch (e) {
      console.warn("[TLMAuth] Supabase load failed, using local fallback:", e);
      return null;
    }
  }
  function sessionToUser(s) {
    const u = s.user || {};
    return {
      id: u.id,
      email: u.email,
      name: u.user_metadata?.full_name || u.user_metadata?.name || (u.email || "").split("@")[0],
      avatar: u.user_metadata?.avatar_url || null,
      provider: u.app_metadata?.provider || "email",
      created: u.created_at,
      last: u.last_sign_in_at
    };
  }

  // Boot from local first so UI updates immediately
  user = readLocal();
  // Then try to upgrade to a real Supabase session in the background
  getSb();

  // ---------- public API ----------
  const onChange = (fn) => { listeners.add(fn); fn(user); return () => listeners.delete(fn); };
  const getUser  = () => user;
  async function signOut() {
    try { (await getSb())?.auth.signOut(); } catch {}
    logEvent("signout");
    user = null; writeLocal(null); emit();
  }

  function openSignIn(opts = {}) {
    return new Promise((resolve) => {
      buildModal({
        reason: opts.reason || null,
        onSuccess: (u) => { resolve(u); },
        onCancel:  ()  => { resolve(null); }
      });
    });
  }
  async function requireSignIn(opts = {}) {
    if (user) return user;
    return openSignIn(opts);
  }

  // Subscribe + capture-newsletter helper used by /save flows
  async function trackSubscribe(emailFromForm, optIn) {
    if (!emailFromForm) return;
    if (sb) {
      sb.from("tlm_subscribers").upsert({
        email: emailFromForm, subscribed: !!optIn, last_seen: new Date().toISOString()
      }, { onConflict: "email" }).then(() => {}, () => {});
    } else {
      try {
        const arr = JSON.parse(localStorage.getItem("tlm:subs") || "[]");
        const i = arr.findIndex(x => x.email === emailFromForm);
        const row = { email: emailFromForm, subscribed: !!optIn, ts: Date.now() };
        if (i >= 0) arr[i] = row; else arr.push(row);
        localStorage.setItem("tlm:subs", JSON.stringify(arr));
      } catch {}
    }
  }

  // ---------- modal UI ----------
  let modalOpen = false;
  function buildModal({ reason, onSuccess, onCancel }) {
    if (modalOpen) return;
    modalOpen = true;

    const css = `
    .tlm-auth{position:fixed;inset:0;z-index:200;display:flex;align-items:center;justify-content:center;background:radial-gradient(120% 80% at 50% 30%,rgba(218,165,32,.18) 0%,rgba(0,0,0,.85) 60%);backdrop-filter:blur(10px) saturate(140%);-webkit-backdrop-filter:blur(10px) saturate(140%);opacity:0;transition:opacity .3s ease;padding:24px}
    .tlm-auth.is-in{opacity:1}
    .tlm-auth__panel{width:min(440px,100%);background:linear-gradient(180deg,#161616 0%,#0E0E0E 100%);color:#fff;border:1px solid rgba(218,165,32,.45);border-radius:18px;padding:26px 24px 22px;box-shadow:0 30px 80px rgba(0,0,0,.6),0 0 60px -10px rgba(218,165,32,.4);transform:translateY(14px) scale(.985);transition:transform .3s cubic-bezier(.2,.7,.2,1);max-height:calc(100dvh - 40px);overflow:auto}
    .tlm-auth.is-in .tlm-auth__panel{transform:none}
    .tlm-auth__close{position:absolute;top:8px;right:14px;background:transparent;border:0;color:rgba(255,255,255,.6);font-size:22px;cursor:pointer;padding:6px 10px;border-radius:8px}
    .tlm-auth__close:hover{background:rgba(255,255,255,.08);color:#fff}
    .tlm-auth__eyebrow{display:inline-flex;align-items:center;gap:8px;font-size:.74rem;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:#FFD970;margin-bottom:8px}
    .tlm-auth__eyebrow::before{content:"";width:24px;height:2px;background:#DAA520;border-radius:2px}
    .tlm-auth h2{margin:0 0 6px;font-size:1.4rem;color:#fff;font-family:"SF Pro Display",Inter,sans-serif;font-weight:800;letter-spacing:-.01em}
    .tlm-auth p{margin:0 0 16px;font-size:.92rem;color:rgba(255,255,255,.78);line-height:1.5}
    .tlm-auth__reason{background:rgba(218,165,32,.10);border:1px solid rgba(218,165,32,.30);border-radius:10px;padding:10px 12px;color:#FFE9B3;font-size:.82rem;margin:0 0 14px}
    .tlm-auth__providers{display:grid;gap:8px;margin-bottom:14px}
    .tlm-auth__btn{display:flex;align-items:center;justify-content:center;gap:10px;padding:11px 14px;border-radius:12px;border:1px solid rgba(255,255,255,.18);background:#1A1A1A;color:#fff;font-weight:700;cursor:pointer;font-size:.95rem;transition:transform .15s ease,background .2s ease,border-color .2s ease}
    .tlm-auth__btn:hover{transform:translateY(-1px);border-color:rgba(218,165,32,.55);background:#222}
    .tlm-auth__btn[disabled]{opacity:.55;cursor:default;transform:none}
    .tlm-auth__btn svg{width:18px;height:18px}
    .tlm-auth__or{display:flex;align-items:center;gap:10px;color:rgba(255,255,255,.45);font-size:.74rem;font-weight:700;text-transform:uppercase;letter-spacing:.14em;margin:6px 0 12px}
    .tlm-auth__or::before,.tlm-auth__or::after{content:"";flex:1;height:1px;background:rgba(255,255,255,.10)}
    .tlm-auth label{display:block;font-size:.78rem;font-weight:700;color:#FFD970;margin:8px 0 6px;letter-spacing:.04em;text-transform:uppercase}
    .tlm-auth input[type="email"],.tlm-auth input[type="password"]{width:100%;background:rgba(255,255,255,.06);border:1px solid rgba(218,165,32,.35);color:#fff;padding:11px 14px;border-radius:12px;font:inherit;transition:border-color .2s ease,box-shadow .2s ease,background .2s ease}
    .tlm-auth input:focus{outline:none;border-color:#FFD970;background:rgba(255,255,255,.10);box-shadow:0 0 0 3px rgba(218,165,32,.30)}
    .tlm-auth__sub{display:flex;align-items:center;gap:8px;margin:14px 0 4px;font-size:.84rem;color:rgba(255,255,255,.78);cursor:pointer}
    .tlm-auth__sub input{accent-color:#DAA520;width:15px;height:15px}
    .tlm-auth__primary{margin-top:14px;width:100%;padding:13px 18px;border-radius:999px;background:linear-gradient(180deg,#FFD970 0%,#DAA520 100%);color:#0E0E0E;font-weight:800;font-size:.95rem;border:0;cursor:pointer;transition:transform .15s ease,box-shadow .2s ease}
    .tlm-auth__primary:hover{transform:translateY(-1px);box-shadow:0 0 0 2px #FFD970,0 18px 36px -10px rgba(218,165,32,.65)}
    .tlm-auth__primary[disabled]{opacity:.55;cursor:default;transform:none}
    .tlm-auth__skip{margin-top:8px;width:100%;padding:11px 16px;border-radius:999px;background:transparent;color:rgba(255,255,255,.7);border:1px solid rgba(255,255,255,.18);cursor:pointer;font-weight:700;font-size:.9rem}
    .tlm-auth__skip:hover{color:#FFD970;border-color:rgba(218,165,32,.55)}
    .tlm-auth__switch{margin:14px 0 0;font-size:.82rem;color:rgba(255,255,255,.6);text-align:center}
    .tlm-auth__switch button{background:transparent;border:0;color:#FFD970;font-weight:700;cursor:pointer;text-decoration:underline}
    .tlm-auth__error{margin:8px 0 0;color:#FFB3A0;font-size:.82rem;font-weight:700;display:none}
    .tlm-auth__error.is-on{display:block}
    .tlm-auth__hint{margin:14px 0 0;font-size:.72rem;color:rgba(255,255,255,.45);line-height:1.4;text-align:center}
    @media (prefers-reduced-motion:reduce){.tlm-auth{transition:none}.tlm-auth__panel{transform:none}}
    `;
    if (!document.getElementById("tlm-auth-css")) {
      const s = document.createElement("style"); s.id = "tlm-auth-css"; s.textContent = css; document.head.appendChild(s);
    }

    const root = document.createElement("div");
    root.className = "tlm-auth";
    root.setAttribute("role","dialog"); root.setAttribute("aria-modal","true"); root.setAttribute("aria-labelledby","tlmAuthTitle");
    root.innerHTML = `
      <form class="tlm-auth__panel" autocomplete="on" novalidate>
        <button type="button" class="tlm-auth__close" aria-label="Close">×</button>
        <span class="tlm-auth__eyebrow">TLM · Finance</span>
        <h2 id="tlmAuthTitle"><span data-mode-title>Sign in to save your plan</span></h2>
        <p data-mode-sub>Save your reentry plan across devices. Optional — close this and continue without signing in.</p>
        ${reason ? `<div class="tlm-auth__reason">${escape(reason)}</div>` : ""}
        <div class="tlm-auth__providers">
          <button type="button" class="tlm-auth__btn" data-prov="google">${ICONS.google} Continue with Google</button>
          <button type="button" class="tlm-auth__btn" data-prov="apple">${ICONS.apple} Continue with Apple</button>
          <button type="button" class="tlm-auth__btn" data-prov="facebook">${ICONS.facebook} Continue with Facebook</button>
        </div>
        <div class="tlm-auth__or">or use your email</div>
        <label for="tlmAuthEmail">Email</label>
        <input id="tlmAuthEmail" name="email" type="email" required autocomplete="email" />
        <label for="tlmAuthPwd">Password</label>
        <input id="tlmAuthPwd" name="password" type="password" required autocomplete="current-password" minlength="6" />
        <label class="tlm-auth__sub" data-only-signup hidden>
          <input type="checkbox" name="subscribed" />
          <span>Send me the optional weekly newsletter (you can unsubscribe anytime).</span>
        </label>
        <p class="tlm-auth__error" id="tlmAuthErr"></p>
        <button type="submit" class="tlm-auth__primary" data-mode-submit>Sign in</button>
        <button type="button" class="tlm-auth__skip">Continue without saving</button>
        <p class="tlm-auth__switch">
          <span data-mode-switch-label>Don't have an account?</span>
          <button type="button" data-toggle-mode>Create one</button>
        </p>
        <p class="tlm-auth__hint">${HAS_SUPABASE ? "Stored in your private TLM account." : "Demo mode — sign-ins are saved on this device only until Supabase is configured."}</p>
      </form>
    `;
    document.body.appendChild(root);
    requestAnimationFrame(() => root.classList.add("is-in"));
    setTimeout(() => root.querySelector("input[type=email]").focus(), 80);

    let mode = "signin";  // or "signup"
    const $ = (q) => root.querySelector(q);
    const err = $("#tlmAuthErr");
    function showErr(msg) { err.textContent = msg; err.classList.add("is-on"); }
    function clearErr() { err.classList.remove("is-on"); }

    function applyMode() {
      $("[data-mode-title]").textContent = mode === "signup" ? "Create your TLM account" : "Sign in to save your plan";
      $("[data-mode-sub]").textContent   = mode === "signup"
        ? "One account keeps your plan in sync across phone + laptop. Takes 30 seconds."
        : "Save your reentry plan across devices. Optional — close this and continue without signing in.";
      $("[data-mode-submit]").textContent = mode === "signup" ? "Create account →" : "Sign in →";
      $("[data-mode-switch-label]").textContent = mode === "signup" ? "Already have an account?" : "Don't have an account?";
      $("[data-toggle-mode]").textContent       = mode === "signup" ? "Sign in" : "Create one";
      $("[data-only-signup]").hidden = mode !== "signup";
      $("input[name=password]").autocomplete = mode === "signup" ? "new-password" : "current-password";
    }
    applyMode();

    $("[data-toggle-mode]").addEventListener("click", () => { mode = mode === "signup" ? "signin" : "signup"; clearErr(); applyMode(); });
    $(".tlm-auth__close").addEventListener("click", () => close(false));
    $(".tlm-auth__skip").addEventListener("click", () => close(false));

    root.querySelectorAll("[data-prov]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const provider = btn.dataset.prov;
        clearErr();
        const client = await getSb();
        if (!client) { showErr(`${provider} sign-in needs Supabase to be configured. Use email + password for now.`); return; }
        try {
          const { error } = await client.auth.signInWithOAuth({
            provider,
            options: { redirectTo: CFG.oauthRedirectTo || location.href }
          });
          if (error) showErr(error.message);
        } catch (e) { showErr(String(e.message || e)); }
      });
    });

    $("form").addEventListener("submit", async (e) => {
      e.preventDefault();
      clearErr();
      const email = $("input[name=email]").value.trim();
      const pwd   = $("input[name=password]").value;
      const subbed = !!$("input[name=subscribed]")?.checked;
      if (!email || !pwd) { showErr("Email and password required."); return; }
      $("[data-mode-submit]").disabled = true;

      try {
        const client = await getSb();
        if (client) {
          if (mode === "signup") {
            const { data, error } = await client.auth.signUp({
              email, password: pwd,
              options: { data: { subscribed: subbed } }
            });
            if (error) throw error;
            user = data.user ? sessionToUser({ user: data.user }) : null;
          } else {
            const { data, error } = await client.auth.signInWithPassword({ email, password: pwd });
            if (error) throw error;
            user = sessionToUser(data.session || { user: data.user });
          }
          await trackSubscribe(email, subbed);
        } else {
          // Local fallback — derive a stable id, no actual password verification
          user = { id: "local-" + btoa(email).replace(/=+$/,""), email,
                   name: email.split("@")[0], avatar: null, provider: "local",
                   created: new Date().toISOString(), last: new Date().toISOString() };
          await trackSubscribe(email, subbed);
        }
        writeLocal(user); emit();
        logEvent(mode === "signup" ? "signup" : "signin", { provider: HAS_SUPABASE ? "email" : "local" });
        close(true);
      } catch (ex) {
        showErr(ex.message || String(ex));
      } finally {
        $("[data-mode-submit]").disabled = false;
      }
    });

    function close(success) {
      modalOpen = false;
      root.classList.remove("is-in");
      setTimeout(() => root.remove(), 320);
      if (success && onSuccess) onSuccess(user);
      else if (!success && onCancel) onCancel();
    }
  }

  function escape(s) { return String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }

  const ICONS = {
    google: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#FFC107" d="M21.8 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.5c-.2 1.3-1 2.4-2.1 3.1v2.6h3.4c2-1.8 3-4.5 3-7.5z"/><path fill="#FF3D00" d="M12 22c2.7 0 5-1 6.7-2.4l-3.4-2.6c-1 .7-2.2 1-3.3 1-2.6 0-4.7-1.7-5.5-4.1H3v2.6C4.7 19.6 8.1 22 12 22z"/><path fill="#4CAF50" d="M6.5 13.9C6.3 13.3 6.2 12.7 6.2 12s.1-1.3.3-1.9V7.5H3C2.4 8.9 2 10.4 2 12s.4 3.1 1 4.5l3.5-2.6z"/><path fill="#1976D2" d="M12 6c1.5 0 2.8.5 3.8 1.5l2.9-2.9C17 3 14.7 2 12 2 8.1 2 4.7 4.4 3 7.5l3.5 2.6C7.3 7.7 9.4 6 12 6z"/></svg>',
    apple:  '<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M16.5 12.6c0-2.7 2.2-4 2.3-4-.3-.4-1.6-2.2-3.7-2.2-1.6 0-2.7.9-3.4.9-.7 0-2-.9-3.3-.9C5.7 6.4 3 8.6 3 12.7c0 4 3.6 7.9 5.6 7.9 1 0 1.5-.7 3-.7s1.9.7 3 .7c2 0 3.6-1.6 4.5-3.5-1.5-.7-2.6-2.2-2.6-4.5zM14.4 4.7c.7-.9 1.2-2.1 1-3.3-1.1.1-2.4.7-3.1 1.6-.7.8-1.3 2-1.1 3.2 1.2.1 2.5-.6 3.2-1.5z"/></svg>',
    facebook: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="#1877F2"><path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5 3.66 9.13 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.51 1.49-3.9 3.77-3.9 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.87h2.77l-.44 2.91h-2.33V22c4.78-.81 8.44-4.94 8.44-9.94z"/></svg>'
  };

  // ---------- expose ----------
  window.TLMAuth = { requireSignIn, openSignIn, signOut, getUser, onChange, trackSubscribe, logEvent };

  // ---------- visible nav portal ----------
  // Drop a "Sign in" pill into the top nav and a matching one into the
  // bottom mobile nav. When signed in, swap to a user avatar dropdown.
  const portalCss = `
  .tlm-portal{display:inline-flex;align-items:center;gap:8px;margin-left:10px;position:relative}
  .tlm-portal__btn{display:inline-flex;align-items:center;gap:8px;padding:8px 14px;border-radius:999px;border:1.5px solid var(--ink,#0E0E0E);color:var(--ink,#0E0E0E);background:transparent;font-weight:700;font-size:.88rem;cursor:pointer;transition:transform .15s ease,background .2s ease,color .2s ease,border-color .2s ease}
  .tlm-portal__btn:hover{background:var(--tlm-gold,#DAA520);color:var(--tlm-charcoal,#0E0E0E);border-color:var(--tlm-gold,#DAA520);transform:translateY(-1px)}
  .tlm-portal__btn--primary{background:var(--tlm-gold,#DAA520);color:var(--tlm-charcoal,#0E0E0E);border-color:var(--tlm-gold,#DAA520)}
  .tlm-portal__btn--primary:hover{box-shadow:0 0 0 2px #FFD970,0 14px 30px -10px rgba(218,165,32,.55)}
  .tlm-portal__avatar{width:28px;height:28px;border-radius:50%;display:grid;place-items:center;background:linear-gradient(135deg,#FFD970,#DAA520);color:#0E0E0E;font-weight:900;font-size:.78rem;border:1.5px solid #DAA520}
  .tlm-portal__menu{position:absolute;right:0;top:calc(100% + 8px);min-width:240px;background:#0E0E0E;color:#fff;border:1px solid rgba(218,165,32,.4);border-radius:14px;box-shadow:0 18px 40px rgba(0,0,0,.45),0 0 0 1px rgba(218,165,32,.25);padding:10px;display:none;z-index:90}
  .tlm-portal__menu.is-open{display:block;animation:tlmPortalIn .22s cubic-bezier(.2,.7,.2,1)}
  @keyframes tlmPortalIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:none}}
  .tlm-portal__head{padding:8px 10px 12px;border-bottom:1px solid rgba(255,255,255,.08);margin-bottom:6px}
  .tlm-portal__name{font-weight:800;color:#FFD970;letter-spacing:-.005em}
  .tlm-portal__email{font-size:.78rem;color:rgba(255,255,255,.6);word-break:break-all}
  .tlm-portal__menu button,.tlm-portal__menu a{display:flex;align-items:center;gap:8px;width:100%;padding:9px 10px;border-radius:10px;background:transparent;color:#fff;border:0;text-decoration:none;font:inherit;font-weight:600;font-size:.88rem;cursor:pointer;text-align:left;transition:background .15s ease,color .15s ease}
  .tlm-portal__menu button:hover,.tlm-portal__menu a:hover{background:rgba(218,165,32,.14);color:#FFD970}
  .tlm-portal__menu .tlm-portal__danger:hover{background:rgba(178,58,31,.20);color:#FFB3A0}
  .tlm-portal__chip{display:inline-flex;align-items:center;gap:4px;font-size:.66rem;font-weight:800;padding:2px 8px;border-radius:999px;background:rgba(218,165,32,.18);color:#FFD970;letter-spacing:.04em;text-transform:uppercase;margin-left:8px}
  /* Mobile: hide top portal label, keep avatar; bottom-nav gets a 6th cell */
  @media (max-width:919px){
    .tlm-portal__label{display:none}
    .tlm-portal__btn{padding:7px 10px}
  }
  .bottom-nav .tlm-portal-mobile{display:grid;place-items:center;gap:2px;padding:10px 4px;color:rgba(255,255,255,.78);font-size:.68rem;font-weight:700;background:transparent;border:0;cursor:pointer;min-height:56px}
  .bottom-nav .tlm-portal-mobile:hover{color:#FFD970}
  `;
  if (!document.getElementById("tlm-portal-css")) {
    const ps = document.createElement("style"); ps.id = "tlm-portal-css"; ps.textContent = portalCss;
    document.head.appendChild(ps);
  }

  function initials(name, email) {
    const src = (name || (email || "").split("@")[0] || "?").trim();
    const parts = src.split(/\s+/).slice(0, 2);
    return parts.map(p => p[0] || "").join("").toUpperCase() || "?";
  }

  function mountPortal() {
    if (document.getElementById("tlmPortal")) return;
    const navCta = document.querySelector(".nav__cta");
    if (!navCta) return;
    const portal = document.createElement("div");
    portal.id = "tlmPortal";
    portal.className = "tlm-portal";
    navCta.appendChild(portal);
    render(portal);

    // Bottom-nav portal cell (mobile)
    const bnav = document.querySelector(".bottom-nav");
    if (bnav && !document.getElementById("tlmPortalMobile")) {
      // Switch grid to 6 columns to make room
      bnav.style.gridTemplateColumns = "repeat(6, 1fr)";
      const m = document.createElement("button");
      m.id = "tlmPortalMobile";
      m.type = "button";
      m.className = "tlm-portal-mobile";
      m.setAttribute("aria-label", "Account");
      m.innerHTML = `
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
          <circle cx="12" cy="8" r="4" stroke="currentColor" stroke-width="2"/>
          <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
        <span data-portal-label>Account</span>`;
      m.addEventListener("click", () => {
        if (user) {
          // open the desktop menu visibility on mobile click
          portal.querySelector(".tlm-portal__menu")?.classList.toggle("is-open");
        } else {
          openSignIn();
        }
      });
      bnav.appendChild(m);
    }
  }

  function render(portal) {
    portal.innerHTML = "";
    if (!user) {
      const signIn = document.createElement("button");
      signIn.type = "button";
      signIn.className = "tlm-portal__btn";
      signIn.innerHTML = `
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" aria-hidden="true">
          <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          <path d="M10 17l5-5-5-5M15 12H3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span class="tlm-portal__label">Sign in</span>`;
      signIn.addEventListener("click", () => openSignIn());

      const create = document.createElement("button");
      create.type = "button";
      create.className = "tlm-portal__btn tlm-portal__btn--primary";
      create.innerHTML = `<span class="tlm-portal__label">Create account</span>`;
      create.addEventListener("click", () => openSignIn({ reason: "Create a free account to save your plan." }));

      portal.appendChild(signIn);
      portal.appendChild(create);
      // Mobile bottom-nav label
      const mlabel = document.querySelector("#tlmPortalMobile [data-portal-label]");
      if (mlabel) mlabel.textContent = "Sign in";
      return;
    }

    // Signed-in state — avatar + dropdown
    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "tlm-portal__btn";
    trigger.setAttribute("aria-haspopup", "menu");
    trigger.setAttribute("aria-expanded", "false");
    trigger.innerHTML = `
      ${user.avatar
        ? `<img src="${user.avatar}" alt="" style="width:28px;height:28px;border-radius:50%"/>`
        : `<span class="tlm-portal__avatar">${initials(user.name, user.email)}</span>`}
      <span class="tlm-portal__label">${(user.name || user.email || "").toString().split(/\s+/)[0] || "Me"}</span>`;
    portal.appendChild(trigger);

    const menu = document.createElement("div");
    menu.className = "tlm-portal__menu";
    menu.setAttribute("role", "menu");
    menu.innerHTML = `
      <div class="tlm-portal__head">
        <div class="tlm-portal__name">${user.name || (user.email || "").split("@")[0]}<span class="tlm-portal__chip">${user.provider || "email"}</span></div>
        <div class="tlm-portal__email">${user.email || ""}</div>
      </div>
      <a href="./index.html#planner" role="menuitem">📋 My plan</a>
      <a href="./hub.html" role="menuitem">🧭 Resources hub</a>
      <button type="button" data-action="newsletter" role="menuitem">📰 Newsletter preferences</button>
      <button type="button" data-action="signout" class="tlm-portal__danger" role="menuitem">↪ Sign out</button>
    `;
    portal.appendChild(menu);

    const toggleMenu = (force) => {
      const open = force != null ? force : !menu.classList.contains("is-open");
      menu.classList.toggle("is-open", open);
      trigger.setAttribute("aria-expanded", String(open));
    };
    trigger.addEventListener("click", (e) => { e.stopPropagation(); toggleMenu(); });
    document.addEventListener("click", (e) => {
      if (!portal.contains(e.target)) toggleMenu(false);
    });

    menu.querySelector('[data-action="signout"]').addEventListener("click", async () => {
      toggleMenu(false);
      await signOut();
    });
    menu.querySelector('[data-action="newsletter"]').addEventListener("click", () => {
      toggleMenu(false);
      const wantOn = confirm(
        "Newsletter preferences\n\n" +
        "OK = subscribe to the weekly TLM newsletter\n" +
        "Cancel = unsubscribe"
      );
      trackSubscribe(user.email, wantOn);
      logEvent("newsletter-pref", { subscribed: wantOn });
      alert(wantOn ? "Subscribed. We'll send a digest each Monday." : "Unsubscribed.");
    });

    // Mobile bottom-nav label (initial)
    const mlabel = document.querySelector("#tlmPortalMobile [data-portal-label]");
    if (mlabel) mlabel.textContent = (user.name || "Me").toString().split(/\s+/)[0];
  }

  // Mount once DOM is ready and re-render on every auth change
  function bootPortal() {
    mountPortal();
    onChange(() => {
      const portal = document.getElementById("tlmPortal");
      if (portal) render(portal);
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bootPortal);
  else bootPortal();
})();
