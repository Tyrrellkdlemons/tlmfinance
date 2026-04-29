/**
 * chatbot.js — privacy-first floating AI chat for The Last Mile · Finance.
 * - No login required. No API key embedded.
 * - Multiple no-key public relays with automatic failover.
 * - Light guardrails: stays on site help, money/AI/crypto/career/study topics.
 *   Politely declines to give legal advice on incarceration / freedom-law topics
 *   and instead points to the real resources on the site.
 * - All chat state is in memory only. Nothing is sent to our servers (we have none).
 */

(function () {
  if (window.__tlmChatLoaded) return;
  window.__tlmChatLoaded = true;

  // ---------- guardrails ----------
  const BLOCK_PATTERNS = [
    /\b(jailbreak|ignore (?:previous|all)|disable|bypass|override).{0,40}(rules|prompt|system|guardrails)/i,
  ];
  // Topics we won't give legal advice on — we redirect to real resources.
  const REDIRECT_PATTERNS = [
    /\b(parole|probation|expung\w+|seal(?:ing)? record|appeal|sentence|sentencing|conviction|criminal record law|right to vote|second amendment)\b/i,
    /\b(immigration|deportation|ICE)\b/i,
    /\b(restraining order|custody|family law|divorce)\b/i,
  ];
  const SYSTEM_PROMPT = [
    "You are TLM Helper, a brief, kind assistant for The Last Mile · Finance — a reentry planning companion at tlmfinance.netlify.app.",
    "Help users with: navigating the site, building a money plan, understanding modern banking, credit, savings, scam avoidance, AI tools, crypto basics, entrepreneurship, study skills, and finding career resources.",
    "Be encouraging and practical. Keep answers short (under 180 words) unless the user asks for more detail. Use plain language; avoid jargon.",
    "If the user asks for legal advice (especially about parole, probation, expungement, sentencing, immigration, custody, voting/firearm rights), politely decline to give legal advice and direct them to the National Reentry Resource Center (nationalreentryresourcecenter.org), Root & Rebound (rootandrebound.org), or 211. Encourage them to consult a licensed attorney.",
    "Never claim to be a lawyer, doctor, or financial advisor. Remind users that recommendations are educational, not personalized advice.",
    "If asked about The Last Mile (TLM), reference: official site thelastmile.org, programs at thelastmile.org/programs/, reentry at thelastmile.org/programs/reentry/.",
    "If you don't know something, say so honestly. Suggest the user check the Resources page or the Hub on this site."
  ].join(" ");

  // ---------- relays ----------
  // Priority 1: our Netlify function (proxies to OpenRouter so the key stays
  // server-side). It rotates 10 open / cheap LLMs for speed + redundancy.
  // Priority 2-N: no-key public Pollinations endpoints as last-resort fallback
  // so the bot still works when the proxy or key is unavailable.
  // Rotated server-side by /.netlify/functions/chat. Ordered roughly by
  // quality + recency — proxy tries each until one returns. Update freely;
  // unknown models on OpenRouter just get skipped.
  const OPEN_MODELS = [
    // 2026-era flagship-tier free models
    "meta-llama/llama-3.3-70b-instruct:free",
    "deepseek/deepseek-chat-v3-0324:free",
    "deepseek/deepseek-r1:free",
    "qwen/qwen-2.5-72b-instruct:free",
    "qwen/qwq-32b-preview:free",
    // Strong mid-tier
    "google/gemini-2.0-flash-exp:free",
    "nousresearch/hermes-3-llama-3.1-405b:free",
    "nvidia/llama-3.1-nemotron-70b-instruct:free",
    "google/gemma-2-9b-it:free",
    // Fast / small
    "microsoft/phi-3-medium-128k-instruct:free",
    "meta-llama/llama-3.2-3b-instruct:free",
    "mistralai/mistral-7b-instruct:free",
    "openchat/openchat-7b:free"
  ];
  const RELAYS = [
    // Single proxy entry — the function rotates through OPEN_MODELS server-side.
    {
      name: "tlm-proxy",
      build: (messages) => ({
        url: "/.netlify/functions/chat",
        init: {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
            models: OPEN_MODELS
          })
        }
      }),
      parse: async (res) => {
        const data = await res.json().catch(() => ({}));
        return (data && (data.text || data.reply) || "").trim();
      }
    },
    {
      name: "pollinations",
      build: (messages) => {
        const last = messages[messages.length - 1].content;
        const sys = encodeURIComponent(SYSTEM_PROMPT);
        const q = encodeURIComponent(last);
        return {
          url: `https://text.pollinations.ai/${q}?system=${sys}&model=openai`,
          init: { method: "GET" }
        };
      },
      parse: async (res) => (await res.text()).trim()
    },
    {
      name: "pollinations-mistral",
      build: (messages) => {
        const last = messages[messages.length - 1].content;
        const sys = encodeURIComponent(SYSTEM_PROMPT);
        const q = encodeURIComponent(last);
        return {
          url: `https://text.pollinations.ai/${q}?system=${sys}&model=mistral`,
          init: { method: "GET" }
        };
      },
      parse: async (res) => (await res.text()).trim()
    },
    {
      name: "pollinations-post",
      build: (messages) => ({
        url: "https://text.pollinations.ai/",
        init: {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
            model: "openai", jsonMode: false
          })
        }
      }),
      parse: async (res) => (await res.text()).trim()
    },
    // Pollinations llama variant for additional rotation diversity
    {
      name: "pollinations-llama",
      build: (messages) => {
        const last = messages[messages.length - 1].content;
        const sys = encodeURIComponent(SYSTEM_PROMPT);
        const q = encodeURIComponent(last);
        return {
          url: `https://text.pollinations.ai/${q}?system=${sys}&model=llama`,
          init: { method: "GET" }
        };
      },
      parse: async (res) => (await res.text()).trim()
    },
    // HuggingFace Inference API public endpoint — no key, generous free tier.
    // Strict last-resort because of rate limits.
    {
      name: "huggingface-mistral",
      build: (messages) => {
        const conversation = [
          { role: 'system', content: SYSTEM_PROMPT },
          ...messages
        ].map(m => `${m.role === 'user' ? 'User' : m.role === 'assistant' ? 'Assistant' : 'System'}: ${m.content}`).join('\n');
        return {
          url: 'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.3',
          init: {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              inputs: conversation + '\nAssistant:',
              parameters: { max_new_tokens: 280, temperature: 0.5, return_full_text: false }
            })
          }
        };
      },
      parse: async (res) => {
        const data = await res.json().catch(() => null);
        if (!data) return '';
        if (Array.isArray(data) && data[0] && data[0].generated_text) return String(data[0].generated_text).trim();
        if (data.generated_text) return String(data.generated_text).trim();
        return '';
      }
    }
  ];

  function looksBlocked(text) {
    return BLOCK_PATTERNS.some(p => p.test(text));
  }
  function isRedirectTopic(text) {
    return REDIRECT_PATTERNS.some(p => p.test(text));
  }
  const REDIRECT_REPLY = `I can't give legal advice — that's important enough to come from a real attorney. Reentry-specific legal help is free at:

• National Reentry Resource Center — nationalreentryresourcecenter.org
• Root & Rebound — rootandrebound.org
• 211 — dial 2-1-1 or visit 211.org

For everything else (money plan, credit, AI, crypto, careers, study) — ask away and I'll help.`;

  async function callRelay(relay, messages, signal) {
    const { url, init } = relay.build(messages);
    const res = await fetch(url, { ...init, signal });
    if (!res.ok) throw new Error(`${relay.name} HTTP ${res.status}`);
    const text = await relay.parse(res);
    if (!text || text.length < 2) throw new Error(`${relay.name} empty`);
    return text;
  }

  async function chat(messages) {
    const last = messages[messages.length - 1].content || "";
    if (looksBlocked(last)) return "I'll keep my standard rules — let's stick to site help, money, learning, or career topics. What can I help you with?";
    if (isRedirectTopic(last)) return REDIRECT_REPLY;

    for (const relay of RELAYS) {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 18000);
      try {
        const reply = await callRelay(relay, messages, ctrl.signal);
        clearTimeout(timer);
        return reply;
      } catch (e) {
        clearTimeout(timer);
        // try next relay
      }
    }
    return "All of my AI relays are unavailable right now. Try again in a minute, or check the Hub page — the FAQ and curated links cover most of what people ask.";
  }

  // ---------- UI ----------
  const STYLES = `
  .tlm-chat-fab{position:fixed;right:18px;bottom:88px;z-index:120;width:56px;height:56px;border-radius:50%;background:#DAA520;color:#0E0E0E;border:0;display:grid;place-items:center;box-shadow:0 12px 30px rgba(0,0,0,.35),0 0 0 4px rgba(218,165,32,.25);cursor:pointer;transition:transform .2s ease}
  .tlm-chat-fab:hover{transform:scale(1.05)}
  .tlm-chat-fab svg{width:26px;height:26px}
  @media (min-width:920px){.tlm-chat-fab{bottom:24px}}
  .tlm-chat{position:fixed;right:18px;bottom:154px;z-index:120;width:min(360px,92vw);max-height:min(72dvh,640px);background:#0E0E0E;color:#fff;border:1px solid rgba(218,165,32,.35);border-radius:18px;box-shadow:0 30px 80px rgba(0,0,0,.5);display:none;flex-direction:column;overflow:hidden}
  .tlm-chat[data-open="true"]{display:flex}
  @media (min-width:920px){.tlm-chat{bottom:88px}}
  .tlm-chat__head{padding:12px 14px;display:flex;align-items:center;justify-content:space-between;gap:10px;background:linear-gradient(180deg,#1A1A1A 0%,#0E0E0E 100%);border-bottom:1px solid rgba(255,255,255,.06)}
  .tlm-chat__title{font-weight:800;letter-spacing:-.01em;font-family:"SF Pro Display",Inter,sans-serif}
  .tlm-chat__title span{color:#DAA520}
  .tlm-chat__close{background:transparent;color:#fff;border:0;font-size:20px;cursor:pointer;padding:4px 8px;border-radius:6px}
  .tlm-chat__close:hover{background:rgba(255,255,255,.08)}
  .tlm-chat__msgs{flex:1;overflow:auto;padding:14px;display:flex;flex-direction:column;gap:10px;font-size:.92rem;line-height:1.5}
  .tlm-chat__msg{padding:10px 12px;border-radius:12px;max-width:85%;white-space:pre-wrap}
  .tlm-chat__msg--bot{background:rgba(218,165,32,.10);border:1px solid rgba(218,165,32,.18);align-self:flex-start;color:#FAF7EE}
  .tlm-chat__msg--user{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);align-self:flex-end}
  .tlm-chat__msg a{color:#DAA520}
  .tlm-chat__form{display:flex;gap:6px;padding:10px;border-top:1px solid rgba(255,255,255,.06);background:#0A0A0A}
  .tlm-chat__input{flex:1;background:#1A1A1A;color:#fff;border:1px solid rgba(255,255,255,.10);border-radius:10px;padding:9px 12px;font:inherit}
  .tlm-chat__input:focus{outline:2px solid #DAA520;outline-offset:1px}
  .tlm-chat__send{background:#DAA520;color:#0E0E0E;border:0;border-radius:10px;padding:9px 14px;font-weight:800;cursor:pointer}
  .tlm-chat__send[disabled]{opacity:.5;cursor:default}
  .tlm-chat__hint{font-size:.72rem;color:rgba(255,255,255,.55);padding:0 12px 10px}
  .tlm-chat__chips{display:flex;flex-wrap:wrap;gap:6px;padding:6px 12px 0}
  .tlm-chat__chip{font-size:.74rem;padding:5px 10px;border-radius:99px;background:rgba(255,255,255,.06);color:#fff;border:1px solid rgba(218,165,32,.25);cursor:pointer}
  .tlm-chat__chip:hover{background:rgba(218,165,32,.18)}
  @media (prefers-reduced-motion: reduce){.tlm-chat-fab{transition:none}}
  `;
  const css = document.createElement("style"); css.textContent = STYLES; document.head.appendChild(css);

  const fab = document.createElement("button");
  fab.className = "tlm-chat-fab";
  fab.setAttribute("aria-label", "Open the TLM Helper chatbot");
  fab.innerHTML = `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-5 4V5z" stroke="currentColor" stroke-width="2"/><circle cx="9" cy="9.5" r="1.2" fill="currentColor"/><circle cx="13.5" cy="9.5" r="1.2" fill="currentColor"/></svg>`;
  document.body.appendChild(fab);

  const panel = document.createElement("aside");
  panel.className = "tlm-chat";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-labelledby", "tlmChatTitle");
  panel.innerHTML = `
    <div class="tlm-chat__head">
      <div class="tlm-chat__title" id="tlmChatTitle">TLM <span>Helper</span></div>
      <button class="tlm-chat__close" aria-label="Close">×</button>
    </div>
    <div class="tlm-chat__msgs" id="tlmMsgs" aria-live="polite"></div>
    <div class="tlm-chat__chips" id="tlmChips"></div>
    <form class="tlm-chat__form" autocomplete="off">
      <input class="tlm-chat__input" id="tlmInput" placeholder="Ask about money, credit, AI, crypto, careers…" maxlength="400" required />
      <button class="tlm-chat__send" type="submit">Send</button>
    </form>
    <div class="tlm-chat__hint">Educational only · No legal/medical/investment advice · Replies use a public AI relay.</div>
  `;
  document.body.appendChild(panel);

  const els = {
    msgs: panel.querySelector("#tlmMsgs"),
    chips: panel.querySelector("#tlmChips"),
    input: panel.querySelector("#tlmInput"),
    form: panel.querySelector("form"),
    send: panel.querySelector(".tlm-chat__send"),
    close: panel.querySelector(".tlm-chat__close")
  };

  const history = [];
  function pushMsg(role, content) {
    const div = document.createElement("div");
    div.className = "tlm-chat__msg " + (role === "user" ? "tlm-chat__msg--user" : "tlm-chat__msg--bot");
    // very simple link autolinker
    div.innerHTML = String(content).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/(https?:\/\/[^\s<]+)/g,
      m => `<a href="${m}" target="_blank" rel="noopener">${m}</a>`);
    els.msgs.appendChild(div);
    els.msgs.scrollTop = els.msgs.scrollHeight;
    history.push({ role, content });
  }
  function open() { panel.dataset.open = "true"; els.input.focus(); }
  function close() { panel.dataset.open = "false"; }

  fab.addEventListener("click", () => {
    if (panel.dataset.open === "true") close(); else open();
  });
  els.close.addEventListener("click", close);

  // First message + suggestion chips
  pushMsg("bot", "Hi — I'm TLM Helper. I can explain how the site works, help build a money plan, simplify banking/credit/crypto/AI, or coach you through your 72-hour, 30, 60, and 90-day plan. What's on your mind?");

  [
    "Where do I start?",
    "Open a bank account fast",
    "Build credit from zero",
    "Write me a resume",
    "Find fair-chance jobs",
    "Is crypto safe for beginners?",
    "What's my 72-hour plan?",
    "How do I dispute my credit report?",
    "AI tools I can actually use",
    "Help me pick a side hustle"
  ].forEach(t => {
    const c = document.createElement("button");
    c.type = "button"; c.className = "tlm-chat__chip"; c.textContent = t;
    c.addEventListener("click", () => { els.input.value = t; els.form.requestSubmit(); });
    els.chips.appendChild(c);
  });

  els.form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const q = els.input.value.trim();
    if (!q) return;
    pushMsg("user", q);
    els.input.value = "";
    els.send.disabled = true;
    const typing = document.createElement("div");
    typing.className = "tlm-chat__msg tlm-chat__msg--bot";
    typing.textContent = "…";
    els.msgs.appendChild(typing); els.msgs.scrollTop = els.msgs.scrollHeight;
    try {
      const reply = await chat(history);
      typing.remove();
      pushMsg("bot", reply || "Hmm, the AI relay returned nothing. Try a different question?");
    } catch {
      typing.remove();
      pushMsg("bot", "Network hiccup — try again in a moment.");
    } finally {
      els.send.disabled = false;
      els.input.focus();
    }
  });
})();
