/**
 * netlify/functions/newsletter.js
 *
 * Weekly digest sender for TLM Finance subscribers.
 *
 * Pulls the subscriber list from Netlify Forms (the "tlm-contacts" form),
 * picks one of several content rotations based on the ISO week number, and
 * blasts it through Resend so the message body changes every send.
 *
 * Schedule it as a Netlify Scheduled Function. Add to netlify.toml:
 *
 *   [[functions]]
 *     schedule = "0 14 * * 1"   # every Monday at 14:00 UTC = 7am PT
 *     name     = "newsletter"
 *
 * Required env vars:
 *   RESEND_API_KEY        — sender key (resend.com)
 *   NETLIFY_API_TOKEN     — for reading form submissions (netlify.com → User → Apps → Personal access tokens)
 *   NETLIFY_SITE_ID       — find in Netlify site → Site configuration → Site information
 */

const ISSUES = [
  {
    subject: "TLM Finance · This week — banking moves that compound",
    body: `<p><strong>This week:</strong> small money moves that pay back over years.</p>
           <ul>
             <li>Open a Bank On certified checking account → joinbankon.org/accounts</li>
             <li>Auto-transfer $10/wk into savings (set it once, forget it)</li>
             <li>Pull your free credit reports → annualcreditreport.com</li>
           </ul>
           <p>Reply to this email with one money question and we'll cover it next week.</p>`
  },
  {
    subject: "TLM Finance · This week — credit, the slow superpower",
    body: `<p><strong>This week:</strong> credit moves that work even from $0.</p>
           <ul>
             <li>Try Self.inc or local-CU credit-builder loan ($25/mo)</li>
             <li>Freeze your reports at all 3 bureaus — free, takes 10 min</li>
             <li>Dispute any account you didn't open (identitytheft.gov)</li>
           </ul>`
  },
  {
    subject: "TLM Finance · This week — AI tools that actually save time",
    body: `<p><strong>This week:</strong> three AI moves you can use today.</p>
           <ul>
             <li>Resume rewrite — paste your old one into ChatGPT/Claude with the job ad</li>
             <li>Interview prep — ask Claude for 5 STAR questions for [job title]</li>
             <li>Bill explainer — paste any confusing letter and ask "what does this mean?"</li>
           </ul>`
  },
  {
    subject: "TLM Finance · This week — your first 90-day audit",
    body: `<p><strong>This week:</strong> a 5-minute check-in.</p>
           <ul>
             <li>Did you replace your ID + Social Security card?</li>
             <li>Are you on a Bank On or second-chance account?</li>
             <li>Have you applied to 3+ fair-chance employers in the last 14 days?</li>
           </ul>
           <p>If any of those is no, open the planner and add one task today.</p>`
  },
  {
    subject: "TLM Finance · This week — side income, no scams",
    body: `<p><strong>This week:</strong> three real ways to add cash flow.</p>
           <ul>
             <li>Fiverr / Upwork — sell one skill at $25/hr</li>
             <li>DoorDash, UberEats — most allow drivers with records (check state)</li>
             <li>Whatnot, eBay — flip something you already own</li>
           </ul>`
  }
];

function isoWeek(d = new Date()) {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil((((t - yearStart) / 86400000) + 1) / 7);
}

async function getSubscribers() {
  const token = process.env.NETLIFY_API_TOKEN;
  const site  = process.env.NETLIFY_SITE_ID;
  if (!token || !site) throw new Error("NETLIFY_API_TOKEN / NETLIFY_SITE_ID not set");
  const res = await fetch(`https://api.netlify.com/api/v1/sites/${site}/forms`, {
    headers: { "Authorization": `Bearer ${token}` }
  });
  if (!res.ok) throw new Error(`netlify forms list ${res.status}`);
  const forms = await res.json();
  const form = forms.find(f => f.name === "tlm-contacts");
  if (!form) return [];
  const subs = await fetch(`https://api.netlify.com/api/v1/forms/${form.id}/submissions?per_page=1000`, {
    headers: { "Authorization": `Bearer ${token}` }
  });
  if (!subs.ok) throw new Error(`netlify subs ${subs.status}`);
  const data = await subs.json();
  // Only those who opted in to the newsletter and gave an email
  return data
    .map(s => s.data || {})
    .filter(d => (d.subscribed === "yes" || d.subscribed === true) && d.email)
    .map(d => d.email);
}

async function sendBatch({ key, to, subject, html }) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "TLM Finance <weekly@tlmfinance.netlify.app>",
      to,
      subject,
      html: `<div style="font-family:-apple-system,Segoe UI,Inter,sans-serif;max-width:560px;margin:0 auto;padding:20px;color:#0E0E0E">
               <div style="border-bottom:3px solid #DAA520;padding-bottom:10px;margin-bottom:18px">
                 <strong style="font-size:1.1rem">The Last Mile · <span style="color:#8C6810">Finance</span></strong>
               </div>
               ${html}
               <p style="margin-top:24px;font-size:.78rem;color:#6B6B6B">You're receiving this because you opted in at tlmfinance.netlify.app. Reply STOP or "unsubscribe" to be removed.</p>
             </div>`
    })
  });
  if (!res.ok) throw new Error(`resend ${res.status}`);
  return res.json();
}

export const handler = async () => {
  if (!process.env.RESEND_API_KEY) {
    return { statusCode: 500, body: "RESEND_API_KEY missing" };
  }
  let subscribers;
  try { subscribers = await getSubscribers(); }
  catch (e) { return { statusCode: 500, body: String(e.message || e) }; }
  if (!subscribers.length) return { statusCode: 200, body: "no subscribers" };

  const issue = ISSUES[isoWeek() % ISSUES.length];
  // Resend supports up to 50 recipients per call; chunk if needed.
  const chunks = [];
  for (let i = 0; i < subscribers.length; i += 50) chunks.push(subscribers.slice(i, i + 50));
  const results = [];
  for (const c of chunks) {
    try {
      const r = await sendBatch({ key: process.env.RESEND_API_KEY, to: c, subject: issue.subject, html: issue.body });
      results.push({ ok: true, count: c.length, id: r.id });
    } catch (e) {
      results.push({ ok: false, count: c.length, error: String(e.message || e) });
    }
  }
  return { statusCode: 200, body: JSON.stringify({ issue: issue.subject, sent: subscribers.length, results }) };
};
