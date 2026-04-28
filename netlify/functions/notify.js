/**
 * netlify/functions/notify.js
 *
 * Optional instant email + SMS notify for new contact-gate sign-ups.
 *
 * If `RESEND_API_KEY` is set, sends an email to NOTIFY_EMAIL using Resend.
 * If `TWILIO_*` envs are set, sends an SMS to NOTIFY_PHONE.
 * Without any keys, the function is a no-op (returns 204) so the front-end
 * fetch falls through silently and the Netlify Form submission still wins.
 *
 * Required (optional) env vars:
 *   RESEND_API_KEY            — get one free at https://resend.com
 *   TWILIO_ACCOUNT_SID
 *   TWILIO_AUTH_TOKEN
 *   TWILIO_FROM_NUMBER        — your Twilio number, e.g. +13105551234
 */

async function sendEmail({ key, to, subject, html }) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${key}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: "TLM Finance <noreply@tlmfinance.netlify.app>",
      to: [to],
      subject,
      html
    })
  });
  if (!res.ok) throw new Error(`resend ${res.status}`);
  return res.json();
}

async function sendSMS({ sid, token, from, to, body }) {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
  const auth = Buffer.from(`${sid}:${token}`).toString("base64");
  const params = new URLSearchParams({ From: from, To: to, Body: body });
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: params.toString()
  });
  if (!res.ok) throw new Error(`twilio ${res.status}`);
  return res.json();
}

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "POST only" };
  }
  let body;
  try { body = JSON.parse(event.body || "{}"); }
  catch { return { statusCode: 400, body: "bad json" }; }

  const NOTIFY_EMAIL = body.notify_email;
  const NOTIFY_PHONE = body.notify_phone;
  const visitor = `email=${body.email || "(none)"} · phone=${body.phone || "(none)"} · page=${body.page || "/"} · subscribed=${body.subscribed ? "yes" : "no"}`;

  const tasks = [];

  if (process.env.RESEND_API_KEY && NOTIFY_EMAIL) {
    tasks.push(sendEmail({
      key: process.env.RESEND_API_KEY,
      to: NOTIFY_EMAIL,
      subject: "New TLM Finance contact",
      html: `<p>New visitor signed in via the contact gate.</p>
             <pre style="font-family:Menlo,monospace;background:#f6f3eb;padding:14px;border-radius:8px">${visitor}</pre>
             <p style="color:#666;font-size:12px">Sent from netlify/functions/notify.js</p>`
    }).catch(e => ({ error: String(e) })));
  }

  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER && NOTIFY_PHONE) {
    tasks.push(sendSMS({
      sid:   process.env.TWILIO_ACCOUNT_SID,
      token: process.env.TWILIO_AUTH_TOKEN,
      from:  process.env.TWILIO_FROM_NUMBER,
      to:    NOTIFY_PHONE.replace(/[^\d+]/g, ""),
      body:  `TLM Finance · new sign-in: ${visitor}`
    }).catch(e => ({ error: String(e) })));
  }

  if (!tasks.length) {
    // No keys configured — just return 204 so the front-end ignores us.
    return { statusCode: 204, body: "" };
  }

  const results = await Promise.allSettled(tasks);
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ok: true, results })
  };
};
