/**
 * contact-gate.js — first-visit contact prompt for The Last Mile · Finance.
 *
 * Asks the visitor for an email OR a phone number before they can use the
 * site. Once submitted (or once we record that the user signed in once),
 * we never show this again. The form posts to a Netlify Form named
 * "tlm-contacts" so submissions land in your Netlify dashboard for free,
 * with no API keys, no SMTP, no third-party service.
 *
 * The two static notification targets (your email and phone) are kept
 * in this file only as `data-*` attributes on the form so they get
 * delivered with the submission instead of rendered on the page.
 *
 * Newsletter opt-in is captured as a hidden `subscribed` field. Pair this
 * with a scheduled Netlify function or a Resend/Mailgun account to send
 * the weekly digest — see `netlify/functions/newsletter.js` for a starter.
 */
(function () {
  if (window.__tlmGateLoaded) return;
  window.__tlmGateLoaded = true;

  // SUPERSEDED — site no longer requires gating to be used. Auth is now
  // requested only when the user wants to save their plan (see auth.js).
  // Keeping this file in place so older deploys don't 404; bail early.
  if (!window.__TLM_CONFIG || !window.__TLM_CONFIG.forceContactGate) return;

  // Already gave us their info before — never show again.
  try {
    if (localStorage.getItem("tlm:contact:v1")) return;
  } catch {}

  // ---------- styles ----------
  const css = `
  .tlm-gate{position:fixed;inset:0;z-index:200;display:flex;align-items:center;justify-content:center;background:radial-gradient(120% 80% at 50% 30%,rgba(218,165,32,.18) 0%,rgba(0,0,0,.85) 60%);backdrop-filter:blur(10px) saturate(140%);-webkit-backdrop-filter:blur(10px) saturate(140%);opacity:0;transition:opacity .35s ease;padding:24px}
  .tlm-gate.is-in{opacity:1}
  .tlm-gate__panel{width:min(440px,100%);background:linear-gradient(180deg,#161616 0%,#0E0E0E 100%);color:#fff;border:1px solid rgba(218,165,32,.45);border-radius:18px;padding:26px 24px 22px;box-shadow:0 30px 80px rgba(0,0,0,.6),0 0 60px -10px rgba(218,165,32,.4);transform:translateY(14px) scale(.985);transition:transform .35s cubic-bezier(.2,.7,.2,1)}
  .tlm-gate.is-in .tlm-gate__panel{transform:none}
  .tlm-gate__eyebrow{display:inline-flex;align-items:center;gap:8px;font-size:.74rem;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:#FFD970;margin-bottom:8px}
  .tlm-gate__eyebrow::before{content:"";width:24px;height:2px;background:#DAA520;border-radius:2px}
  .tlm-gate h2{margin:0 0 8px;font-size:1.4rem;letter-spacing:-.01em;color:#fff;font-family:"SF Pro Display",Inter,sans-serif;font-weight:800}
  .tlm-gate p{margin:0 0 16px;font-size:.92rem;color:rgba(255,255,255,.78);line-height:1.5}
  .tlm-gate label{display:block;font-size:.78rem;font-weight:700;color:#FFD970;margin:10px 0 6px;letter-spacing:.04em;text-transform:uppercase}
  .tlm-gate input[type="email"],.tlm-gate input[type="tel"]{width:100%;background:rgba(255,255,255,.06);border:1px solid rgba(218,165,32,.35);color:#fff;padding:12px 14px;border-radius:12px;font:inherit;transition:border-color .2s ease,background .2s ease,box-shadow .2s ease}
  .tlm-gate input:focus{outline:none;border-color:#FFD970;background:rgba(255,255,255,.10);box-shadow:0 0 0 3px rgba(218,165,32,.30)}
  .tlm-gate__or{display:flex;align-items:center;gap:10px;color:rgba(255,255,255,.45);font-size:.78rem;font-weight:700;text-transform:uppercase;letter-spacing:.14em;margin:14px 0 0}
  .tlm-gate__or::before,.tlm-gate__or::after{content:"";flex:1;height:1px;background:rgba(255,255,255,.10)}
  .tlm-gate__news{display:flex;align-items:flex-start;gap:10px;margin:18px 0 4px;cursor:pointer}
  .tlm-gate__news input{margin-top:3px;accent-color:#DAA520;width:16px;height:16px}
  .tlm-gate__news span{font-size:.86rem;color:rgba(255,255,255,.85);line-height:1.45}
  .tlm-gate__news strong{color:#FFD970}
  .tlm-gate__cta{margin-top:18px;display:flex;gap:10px;align-items:center}
  .tlm-gate__cta button{flex:1;padding:13px 18px;border-radius:999px;font-weight:800;font-size:.95rem;border:0;cursor:pointer;transition:transform .15s ease,box-shadow .2s ease}
  .tlm-gate__submit{background:linear-gradient(180deg,#FFD970 0%,#DAA520 100%);color:#0E0E0E;box-shadow:0 0 0 1px #DAA520,0 14px 30px -10px rgba(218,165,32,.55)}
  .tlm-gate__submit:hover{transform:translateY(-1px);box-shadow:0 0 0 2px #FFD970,0 18px 36px -10px rgba(218,165,32,.65)}
  .tlm-gate__submit[disabled]{opacity:.55;cursor:default;transform:none}
  .tlm-gate__skip{background:transparent;color:rgba(255,255,255,.7);border:1px solid rgba(255,255,255,.18)}
  .tlm-gate__skip:hover{color:#FFD970;border-color:rgba(218,165,32,.55)}
  .tlm-gate__hint{margin:14px 0 0;font-size:.74rem;color:rgba(255,255,255,.45);line-height:1.4}
  .tlm-gate__error{margin:8px 0 0;color:#FFB3A0;font-size:.82rem;font-weight:700;display:none}
  .tlm-gate__error.is-on{display:block}
  body.tlm-gate-locked{overflow:hidden!important;height:100dvh}
  @media (prefers-reduced-motion:reduce){.tlm-gate{transition:none}.tlm-gate__panel{transform:none}}
  `;
  const style = document.createElement("style"); style.textContent = css; document.head.appendChild(style);

  // Lock scroll while the gate is up
  document.body.classList.add("tlm-gate-locked");

  // ---------- markup ----------
  const root = document.createElement("div");
  root.className = "tlm-gate";
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-modal", "true");
  root.setAttribute("aria-labelledby", "tlmGateTitle");
  root.innerHTML = `
    <form class="tlm-gate__panel"
          name="tlm-contacts"
          method="POST"
          data-netlify="true"
          netlify-honeypot="company-website"
          data-notify-email="$NOTIFY_EMAIL"
          data-notify-phone="$NOTIFY_PHONE">
      <input type="hidden" name="form-name" value="tlm-contacts" />
      <input type="text" name="company-website" autocomplete="off" tabindex="-1" style="position:absolute;left:-9999px" />
      <span class="tlm-gate__eyebrow">Welcome to TLM · Finance</span>
      <h2 id="tlmGateTitle">One quick step before we start.</h2>
      <p>Drop your email or phone number so we can send you your reentry plan, helpful resources, and a weekly digest you can opt out of anytime.</p>
      <label for="tlmGateEmail">Email</label>
      <input id="tlmGateEmail" name="email" type="email" placeholder="you@email.com" autocomplete="email" inputmode="email" />
      <div class="tlm-gate__or">or</div>
      <label for="tlmGatePhone" style="margin-top:8px">Phone</label>
      <input id="tlmGatePhone" name="phone" type="tel" placeholder="(323) 555-0100" autocomplete="tel" inputmode="tel" />
      <label class="tlm-gate__news">
        <input type="checkbox" name="subscribed" value="yes" checked />
        <span><strong>Send me the weekly newsletter.</strong> Vital reentry info, fresh sources, and what's changing — different every week. Unsubscribe anytime.</span>
      </label>
      <p class="tlm-gate__error" id="tlmGateErr">Please enter a valid email or phone number to continue.</p>
      <div class="tlm-gate__cta">
        <button type="submit" class="tlm-gate__submit">Continue →</button>
      </div>
      <p class="tlm-gate__hint">Stored privately. Not sold. Used only to send your plan + weekly digest.</p>
    </form>
  `;
  document.body.appendChild(root);
  requestAnimationFrame(() => root.classList.add("is-in"));

  // Replace the placeholder targets with the configured static contact info.
  // These never render to the DOM — they only ride along with the submission.
  const NOTIFY = {
    // Your inbox + phone (kept out of all visible markup)
    email: "Tyrrellkdlemons@gmail.com",
    phone: "323-972-6100"
  };
  const form = root.querySelector("form");
  form.dataset.notifyEmail = NOTIFY.email;
  form.dataset.notifyPhone = NOTIFY.phone;

  const $email = root.querySelector("#tlmGateEmail");
  const $phone = root.querySelector("#tlmGatePhone");
  const $err   = root.querySelector("#tlmGateErr");

  function isValidEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v); }
  function isValidPhone(v) {
    const digits = v.replace(/\D+/g, "");
    return digits.length >= 10 && digits.length <= 15;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    $err.classList.remove("is-on");
    const emailVal = ($email.value || "").trim();
    const phoneVal = ($phone.value || "").trim();
    if (!isValidEmail(emailVal) && !isValidPhone(phoneVal)) {
      $err.classList.add("is-on");
      ($email.value ? $email : $phone).focus();
      return;
    }
    const fd = new FormData(form);
    fd.append("notify_email", NOTIFY.email);
    fd.append("notify_phone", NOTIFY.phone);
    fd.append("page", location.pathname || "/");
    fd.append("ts",   new Date().toISOString());

    // Persist locally so the gate never shows again on this device.
    try {
      localStorage.setItem("tlm:contact:v1", JSON.stringify({
        email: emailVal || null,
        phone: phoneVal || null,
        subscribed: fd.get("subscribed") === "yes",
        ts: Date.now()
      }));
    } catch {}

    try {
      // POST to Netlify Forms — works automatically on Netlify hosting; no
      // backend or API keys required. Falls through silently if not on Netlify.
      await fetch("/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(fd).toString()
      });
    } catch {}

    // Optional: also fire the relay function for instant email/SMS forwarding
    // (only runs if `netlify/functions/notify.js` is configured with keys).
    try {
      await fetch("/.netlify/functions/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: emailVal, phone: phoneVal,
          subscribed: fd.get("subscribed") === "yes",
          notify_email: NOTIFY.email, notify_phone: NOTIFY.phone,
          page: location.pathname, ts: new Date().toISOString()
        })
      }).catch(() => {});
    } catch {}

    // Dismiss
    document.body.classList.remove("tlm-gate-locked");
    root.classList.remove("is-in");
    setTimeout(() => root.remove(), 380);
  });

  // Block clicks/keys outside the panel — the gate is required.
  root.addEventListener("click", (e) => {
    if (!e.target.closest(".tlm-gate__panel")) e.preventDefault();
  });
  document.addEventListener("keydown", function blockEsc(e) {
    if (root.isConnected && e.key === "Escape") { e.preventDefault(); }
  }, { passive: false });
})();
