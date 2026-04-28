/**
 * netlify/functions/chat.js
 *
 * Proxies the TLM Helper chatbot to OpenRouter so the API key stays server-side.
 * Rotates through 10 free / open LLMs in parallel and returns whichever one
 * answers first (Promise.any). Falls back to sequential if Promise.any rejects.
 *
 * Required Netlify env var:
 *   OPENROUTER_API_KEY  — get one free at https://openrouter.ai/keys
 * Optional env vars:
 *   OPENROUTER_REFERRER  (defaults to https://tlmfinance.netlify.app)
 *   OPENROUTER_TITLE     (defaults to "TLM Finance")
 *
 * Request body:  { messages: [...], models: [string] }   (models is optional)
 * Response:      { text: string, model: string }         on success
 *                { error: string }                       on failure (status 502)
 */

const DEFAULT_MODELS = [
  "meta-llama/llama-3.3-70b-instruct:free",
  "google/gemini-2.0-flash-exp:free",
  "meta-llama/llama-3.2-3b-instruct:free",
  "qwen/qwen-2.5-72b-instruct:free",
  "mistralai/mistral-7b-instruct:free",
  "google/gemma-2-9b-it:free",
  "microsoft/phi-3-medium-128k-instruct:free",
  "nousresearch/hermes-3-llama-3.1-405b:free",
  "openchat/openchat-7b:free",
  "deepseek/deepseek-chat-v3-0324:free"
];

async function callOpenRouter(model, messages, key, signal) {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    signal,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${key}`,
      "HTTP-Referer": process.env.OPENROUTER_REFERRER || "https://tlmfinance.netlify.app",
      "X-Title":     process.env.OPENROUTER_TITLE     || "TLM Finance"
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: 600,
      temperature: 0.7
    })
  });
  if (!res.ok) throw new Error(`${model} HTTP ${res.status}`);
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error(`${model} empty`);
  return { text, model };
}

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "POST only" }) };
  }
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    return { statusCode: 500, body: JSON.stringify({ error: "OPENROUTER_API_KEY not configured" }) };
  }

  let body;
  try { body = JSON.parse(event.body || "{}"); }
  catch { return { statusCode: 400, body: JSON.stringify({ error: "bad json" }) }; }

  const messages = Array.isArray(body.messages) ? body.messages : [];
  const models   = Array.isArray(body.models) && body.models.length ? body.models : DEFAULT_MODELS;
  if (!messages.length) {
    return { statusCode: 400, body: JSON.stringify({ error: "messages required" }) };
  }

  // 18s overall budget across all models
  const ctrl = new AbortController();
  const overall = setTimeout(() => ctrl.abort(), 18000);

  try {
    // Race the first 4 models in parallel for speed; fall back to sequential
    // for the remainder if all four reject (rare).
    const racePool = models.slice(0, 4);
    const fallback = models.slice(4);

    let result;
    try {
      result = await Promise.any(racePool.map(m => callOpenRouter(m, messages, key, ctrl.signal)));
    } catch {
      // Sequential fallback
      let lastErr;
      for (const m of fallback) {
        try { result = await callOpenRouter(m, messages, key, ctrl.signal); break; }
        catch (e) { lastErr = e; }
      }
      if (!result) throw lastErr || new Error("all models failed");
    }
    clearTimeout(overall);
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      body: JSON.stringify(result)
    };
  } catch (e) {
    clearTimeout(overall);
    return {
      statusCode: 502,
      body: JSON.stringify({ error: String(e && e.message || e) })
    };
  }
};
