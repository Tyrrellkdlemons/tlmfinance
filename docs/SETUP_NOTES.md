# Setup notes — gate, chatbot, newsletter

Everything is wired and works on Netlify hosting with **zero** keys; keys
unlock optional upgrades. Below is what each piece does and the env vars
to add when you want the upgrade.

## Contact gate (works out of the box)

`src/contact-gate.js` shows a one-time modal asking for an email or phone
before the visitor can use the site. On submit, the form posts to a
**Netlify Form** named `tlm-contacts` — submissions appear in your
Netlify dashboard with no setup. Your email (`Tyrrellkdlemons@gmail.com`)
and phone (`323-972-6100`) ride along with each submission as
`notify_email` / `notify_phone` so you always know where to reply from.
Neither is rendered in the page HTML.

`forms.html` is a hidden static mirror of the form so Netlify's
build-time scanner registers it (the JS-rendered form alone wouldn't be
detected). Don't link to it from anywhere.

## Chatbot — 10-LLM rotation via OpenRouter

`src/chatbot.js` calls `/.netlify/functions/chat` first, then falls back
to no-key Pollinations relays so the bot still works without any setup.

To turn the OpenRouter rotation on:

1. Get a free key at <https://openrouter.ai/keys>
2. In Netlify → Site → Environment variables, add:
   - `OPENROUTER_API_KEY` = your key
   - `OPENROUTER_REFERRER` = `https://tlmfinance.netlify.app` (optional)
   - `OPENROUTER_TITLE` = `TLM Finance` (optional)

The function races the first 4 of these 10 free models in parallel and
returns whichever answers first:

1. `meta-llama/llama-3.3-70b-instruct:free`
2. `google/gemini-2.0-flash-exp:free`
3. `meta-llama/llama-3.2-3b-instruct:free`
4. `qwen/qwen-2.5-72b-instruct:free`
5. `mistralai/mistral-7b-instruct:free`
6. `google/gemma-2-9b-it:free`
7. `microsoft/phi-3-medium-128k-instruct:free`
8. `nousresearch/hermes-3-llama-3.1-405b:free`
9. `openchat/openchat-7b:free`
10. `deepseek/deepseek-chat-v3-0324:free`

If the first 4 all fail, the remaining 6 run sequentially as fallback.

## Optional instant notify (email + SMS) on every gate sign-in

`netlify/functions/notify.js` will email + SMS you when someone fills the
gate. It's a no-op until you add keys.

For email (Resend, free tier covers 3k/mo):

1. Sign up at <https://resend.com> → API Keys
2. Add `RESEND_API_KEY` in Netlify env

For SMS (Twilio):

1. Sign up at <https://www.twilio.com> → Console → API Keys
2. Buy or port a number
3. Add `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` in Netlify env

Both can be enabled independently. With neither set, only the Netlify Form
inbox captures the submission (still works fine).

## Weekly newsletter — auto-rotates content

`netlify/functions/newsletter.js` runs every **Monday at 14:00 UTC** (set
in `netlify.toml`). It pulls subscribers from the `tlm-contacts` Netlify
Form (only those who checked "Send me the weekly newsletter") and sends
the next issue from a 5-issue rotation (banking, credit, AI tools,
90-day audit, side income). The issue picked is `weekNumber % 5` so it
keeps cycling and you can edit `ISSUES` in the file to refresh content.

Required env vars:

- `RESEND_API_KEY` (same one as notify.js)
- `NETLIFY_API_TOKEN` — Netlify → User → Apps → Personal access tokens
- `NETLIFY_SITE_ID` — Netlify → Site configuration → Site information

If those aren't set, the scheduled run returns 500 and skips silently.

## Do you need Neon.tech?

Short answer: **no, not yet.** Everything above runs without a database.

Pick Neon when:

- You want a real subscriber UI (unsubscribe pages, segments, history)
  beyond what Netlify Forms gives you.
- You want the chatbot to remember conversations across sessions.
- You want analytics on which gate sign-ins came from which page.

If/when you add Neon:

1. Sign up at <https://neon.tech> (free tier is plenty)
2. Add `DATABASE_URL` in Netlify env
3. The `@neondatabase/serverless` dep is already in
   `netlify/functions/package.json`, so functions can import it.

Until then, Netlify Forms + Resend + Twilio is the most "inline" stack and
costs nothing for typical traffic.

---

## Auth — Supabase (recommended) or local-only fallback

The site has a full sign-in modal at `src/auth.js` with email/password +
Google + Apple + Facebook. By default it works in **local fallback** mode:
sign-ins are saved on the device only. To turn on real cross-device auth
+ OAuth providers + cloud user list, configure Supabase (free tier):

1. **Create the project** — sign up at <https://supabase.com>, create a
   new project. Copy the *Project URL* and the *anon public* key from
   Project Settings → API.

2. **Enable providers** — Authentication → Providers:
   - **Email** is on by default (works immediately).
   - **Google** — toggle on, paste the OAuth client ID/secret from
     <https://console.cloud.google.com/apis/credentials>. Add the
     redirect URL Supabase shows you.
   - **Apple** — toggle on, follow the Apple-specific guide on the
     Supabase dashboard (Service ID + key file).
   - **Facebook** — toggle on, paste the Facebook App ID + secret from
     <https://developers.facebook.com/apps/>.

3. **Create the tables** — in Supabase SQL editor, run:
   ```sql
   create table if not exists tlm_subscribers (
     email text primary key,
     phone text,
     name text,
     provider text,
     subscribed boolean default false,
     created_at timestamptz default now(),
     last_seen timestamptz default now()
   );
   create table if not exists tlm_audit (
     id bigserial primary key,
     user_id uuid,
     kind text,
     meta jsonb,
     page text,
     created_at timestamptz default now()
   );
   ```

4. **Wire it into the site** — add this snippet to the `<head>` of every
   HTML file (or just `index.html` and let visitors bring it via storage).
   Replace the two values with yours:
   ```html
   <script>
     window.__TLM_CONFIG = {
       supabaseUrl: "https://YOUR-PROJECT.supabase.co",
       supabaseAnonKey: "YOUR-ANON-PUBLIC-KEY"
     };
   </script>
   ```
   The anon key is **safe to ship** in static HTML — it's read-only by
   default; row-level-security on Supabase tables controls writes.

After that, the sign-in modal hits the cloud, the admin panel's
**Sign-ins & subscribers** view pulls live data, and the audit log writes
events into Supabase too.

## Why Supabase and not Neon (for auth)

- **Supabase** = Postgres + auth + OAuth + JS SDK + free tier (50k MAU).
  Drop-in for a static Netlify site. Zero servers required.
- **Neon** = Postgres only. You'd have to build email verification,
  password hashing, and the OAuth dance yourself. Worth it later if you
  outgrow Supabase or need write-heavy custom data, but start here.
- Both fit. Supabase is the "inline" answer.

---

## Admin panel — three discreet entry points

From any page on the site:

1. **Click the brand logo 7 times within 3 seconds** — desktop or mobile.
2. **Type `TLMadmin`** anywhere on the page (not in an input field).
3. **Konami code** — `↑ ↑ ↓ ↓ ← → ← → b a`.

All three open `admin.html`. The legacy methods (`#admin` URL hash and
`Ctrl/Cmd + Shift + A`) still work as backups.

Inside the admin panel:

- **Sign-ins & subscribers** — searchable user table, CSV export.
- **Audit log** — last 200 events (sign-ins, sign-ups, plan saves), JSON export.
- **Pages & visibility** — toggle any page to hidden; visitors are
  redirected. Admin can preview hidden pages with `?adminview=1`.
- **Quick site tweaks** — re-enable the blocking contact gate, hide the
  install prompt, hide the bottom-nav.

The first time you open the admin panel it asks for a passcode. Type any
passcode — it's saved on that device only and re-asked once a year.

## Login is now optional

The contact-gate that blocked the whole site is **off by default**. The
new flow:

- Site is fully usable without sign-in.
- **Login is requested only when you want to save your plan** — print,
  export JSON/CSV, save to phone, or share. The user can skip it and
  still get the action with local-only save.
- Newsletter is an optional unchecked checkbox inside the sign-up flow.

Toggle the legacy blocking gate back on from Admin → Pages & visibility →
"Force contact gate" if you ever want it back.
