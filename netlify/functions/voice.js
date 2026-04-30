/**
 * netlify/functions/voice.js
 *
 * Proxies the self-running presentation's per-slide narration to ElevenLabs
 * Text-to-Speech, so the API key stays server-side and the browser never
 * sees it. Returns audio/mpeg bytes; the player caches the blob locally.
 *
 * The default voice is the public ElevenLabs share the project owner picked:
 *   https://elevenlabs.io/app/voice-lab/share/<token>/ktkP7Nsj67dw2zcplQYt
 * The voice id is "ktkP7Nsj67dw2zcplQYt".
 *
 * Required Netlify env var (set in dashboard, NOT committed):
 *   ELEVENLABS_API_KEY     — get one free at https://elevenlabs.io/app/settings/api-keys
 *
 * Optional env vars:
 *   ELEVENLABS_VOICE_ID    — override the default voice
 *   ELEVENLABS_MODEL_ID    — override the default model (eleven_turbo_v2_5)
 *
 * Request:
 *   POST /.netlify/functions/voice
 *   { "text": "Welcome. I am the voice of TLM Finance...", "voice": "ktkP7Nsj67dw2zcplQYt" }
 *
 * Response (200):
 *   audio/mpeg bytes (base64-encoded, the Netlify edge handles the binary
 *   transfer transparently because we set isBase64Encoded:true)
 *
 * Response on failure:
 *   503 — server not configured (no API key set)
 *   502 — ElevenLabs error or upstream timeout
 *   400 — missing text
 *
 * The browser player gracefully falls back to its built-in SpeechSynthesis
 * (male voice preferred) if this function returns any non-200 status, so the
 * site keeps working even if the env var is never set.
 */

const DEFAULT_VOICE_ID = "ktkP7Nsj67dw2zcplQYt";          // user-chosen ElevenLabs share
// Adam — a built-in default ElevenLabs voice that's free on every tier. Used as a
// resilient fallback when the chosen voice 402/403's (e.g. "library voice on free tier").
const FALLBACK_VOICE_ID = "pNInz6obpgDQGcFmaJgB";
const DEFAULT_MODEL_ID = "eleven_turbo_v2_5"; // fast, low-latency, high quality
const ENDPOINT = (id) => `https://api.elevenlabs.io/v1/text-to-speech/${id}`;
const TIMEOUT_MS = 25000;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400"
};

function jsonResponse(status, payload) {
  return {
    statusCode: status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
    body: JSON.stringify(payload)
  };
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders, body: "" };
  }

  // Accept POST {text, voice?, model?} or GET ?text=...
  let text = null;
  let voice = null;
  let model = null;

  try {
    if (event.httpMethod === "POST") {
      const body = JSON.parse(event.body || "{}");
      text  = body.text;
      voice = body.voice || body.voiceId;
      model = body.model || body.modelId;
    } else {
      const q = event.queryStringParameters || {};
      text  = q.text;
      voice = q.voice;
      model = q.model;
    }
  } catch (e) {
    return jsonResponse(400, { error: "Invalid JSON body" });
  }

  if (!text || typeof text !== "string" || text.trim().length === 0) {
    return jsonResponse(400, { error: "Missing 'text'" });
  }
  // Sane upper bound — ElevenLabs accepts long strings, but slide narration
  // never exceeds ~1.5KB so 5KB is generous.
  if (text.length > 5000) {
    text = text.slice(0, 5000);
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return jsonResponse(503, {
      error: "ELEVENLABS_API_KEY not set on Netlify. Falling back to browser TTS.",
      hint:  "Add it under Site settings → Environment variables, then redeploy."
    });
  }

  const voiceId = voice || process.env.ELEVENLABS_VOICE_ID || DEFAULT_VOICE_ID;
  const modelId = model || process.env.ELEVENLABS_MODEL_ID || DEFAULT_MODEL_ID;

  // Voice settings tuned for clear narration of finance topics
  const payload = {
    text,
    model_id: modelId,
    voice_settings: {
      stability: 0.45,
      similarity_boost: 0.80,
      style: 0.25,
      use_speaker_boost: true
    }
  };

  // Helper that wraps one ElevenLabs call with a timeout
  async function callEleven(vid) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const r = await fetch(ENDPOINT(vid), {
        method: "POST",
        signal: controller.signal,
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          "Accept": "audio/mpeg"
        },
        body: JSON.stringify(payload)
      });
      const status = r.status;
      if (!r.ok) {
        const detail = await r.text().catch(() => "");
        return { ok: false, status, detail: detail.slice(0, 500) };
      }
      const buf = await r.arrayBuffer();
      return { ok: true, status, buffer: buf };
    } catch (err) {
      const isTimeout = err && err.name === "AbortError";
      return {
        ok: false,
        status: 0,
        detail: isTimeout ? "timeout" : `network: ${err.message || err}`
      };
    } finally {
      clearTimeout(timer);
    }
  }

  // Primary attempt — user-chosen voice
  let result = await callEleven(voiceId);

  // Resilience — if the chosen voice errors with a payment/auth issue (very common
  // for shared library voices on the free tier), retry once with the built-in
  // fallback voice so the presentation still has a real ElevenLabs voice.
  let usedFallback = false;
  const FALLBACK_TRIGGER = new Set([401, 402, 403, 422]);
  if (!result.ok && FALLBACK_TRIGGER.has(result.status) && voiceId !== FALLBACK_VOICE_ID) {
    const second = await callEleven(FALLBACK_VOICE_ID);
    if (second.ok) {
      result = second;
      usedFallback = true;
    } else {
      // Surface the original error if even the fallback fails
      return jsonResponse(502, {
        error: `ElevenLabs returned ${result.status} for primary voice and ${second.status} for fallback`,
        detail: result.detail,
        fallbackDetail: second.detail
      });
    }
  }

  if (!result.ok) {
    return jsonResponse(502, {
      error: `ElevenLabs returned ${result.status}`,
      detail: result.detail
    });
  }

  const b64 = Buffer.from(result.buffer).toString("base64");
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "public, max-age=86400",
      "X-TLM-Voice-Used": usedFallback ? "fallback" : "primary",
      ...corsHeaders
    },
    body: b64,
    isBase64Encoded: true
  };
};
