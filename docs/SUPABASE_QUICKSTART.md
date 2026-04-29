# Supabase quickstart — Google + Apple + Facebook + email login

Total time: ~20 min for Supabase + Google. Apple + Facebook add ~10 min each.

The site is **already wired**. You only have to:
1. create a free Supabase project,
2. run one SQL file,
3. paste two values into `src/tlm-config.js`,
4. click "Enable" on the providers you want.

---

## 1. Create the Supabase project (5 min)

1. Go to <https://supabase.com> → **Start your project** → sign in with GitHub.
2. **New project** → name `tlm-finance` (or whatever) → pick the closest region → set a strong database password (Supabase shows it once — copy somewhere safe).
3. Wait ~60 seconds for the project to provision.

## 2. Run the SQL bootstrap (1 min)

1. Sidebar → **SQL Editor** → **New query**.
2. Copy the entire contents of `docs/supabase-bootstrap.sql` and paste in.
3. Click **Run**. You should see "Success. No rows returned." That's normal.
This creates the `tlm_subscribers`, `tlm_audit`, and `tlm_plans` tables and
locks them down with Row Level Security.

## 3. Paste the two keys into `src/tlm-config.js` (1 min)

1. Sidebar → **Project Settings → API**.
2. Copy **Project URL** and **anon public** (the long `eyJ...` string —
   NOT the `service_role` key).
3. Open `src/tlm-config.js` and fill the two empty strings:
   ```js
   supabaseUrl:     "https://YOUR-PROJECT.supabase.co",
   supabaseAnonKey: "eyJhbGciOiJIUzI1NiIs....",
   ```
4. Save → deploy (`deploy.bat "wire supabase"` or just push to git).

Email + password sign-up now works on the live site. Open the site, click
**Create account** in the top nav, and you're done. Verify the row appeared
in Supabase → Table Editor → `tlm_subscribers`.

---

## 4. Add Google sign-in (~5 min)

In Supabase: sidebar → **Authentication → Providers → Google** → toggle on.
Leave the page open — you'll paste two things into it shortly. Note the
**Callback URL** Supabase shows (looks like `https://xxxx.supabase.co/auth/v1/callback`).

In a new tab:

1. <https://console.cloud.google.com/projectcreate> → name `TLM Finance` → Create.
2. Sidebar → **APIs & Services → OAuth consent screen**:
   - User type: **External** → Create
   - App name: `TLM Finance`
   - User support email: your Gmail
   - Authorized domains: `tlmfinance.netlify.app`, `supabase.co`
   - Developer contact email: your Gmail
   - Save and continue → Add scopes: just `email`, `profile`, `openid` → Save.
   - Test users → add your own email → Save.
3. Sidebar → **APIs & Services → Credentials → + Create Credentials → OAuth client ID**:
   - Application type: **Web application**
   - Name: `TLM Finance Web`
   - Authorized redirect URIs: paste the Supabase callback URL from earlier
   - Create → copy **Client ID** and **Client Secret**.
4. Back on Supabase → Google provider page → paste the Client ID + Client Secret → Save.
5. **Publish** the OAuth consent screen (Google Cloud → OAuth consent screen → Publish app) so non-test users can sign in.

Live site now has working "Continue with Google".

---

## 5. Add Facebook sign-in (~5 min)

In Supabase: **Authentication → Providers → Facebook** → toggle on. Note its callback URL.

1. <https://developers.facebook.com/apps/> → **Create app** → "Authenticate and request data from users with Facebook Login" → Create.
2. **App settings → Basic**: copy the **App ID** and **App Secret**.
3. Sidebar → **Use cases → Authentication, Account creation → Customize → Settings → Valid OAuth Redirect URIs**: paste the Supabase callback URL. Save.
4. Top of page → toggle the app **Live** (left column → "Live" switch). Without this only test users can sign in.
5. Supabase → Facebook provider page → paste App ID + App Secret → Save.

Live site now has "Continue with Facebook".

---

## 6. Add Apple sign-in (~10 min, requires $99/yr Apple Developer)

If you don't have Apple Developer enrollment, skip this — Google + Facebook + email
covers nearly everyone. If you have it:

In Supabase: **Authentication → Providers → Apple** → toggle on. Note the callback URL.

1. <https://developer.apple.com/account/resources/identifiers/list> → register an **App ID** for `app.tlmfinance` (anything reverse-DNS) with Sign in with Apple capability → Continue → Register.
2. Same page → **Identifiers → +** → **Services IDs** → name "TLM Finance Web", id `app.tlmfinance.web` → Register → Configure Sign in with Apple → Web Domain `tlmfinance.netlify.app` → Return URL = the Supabase callback URL → Save.
3. **Keys → +** → name "TLM Finance Sign in" → check Sign in with Apple → Configure → pick the App ID from step 1 → Continue → Register → **Download** the `.p8` key file (one-time download). Note the **Key ID**.
4. **Membership** page → note your **Team ID**.
5. Supabase → Apple provider page → paste:
   - Services ID: `app.tlmfinance.web`
   - Team ID: from step 4
   - Key ID: from step 3
   - Private Key: open the `.p8` file in TextEdit → paste contents → Save.

Live site now has "Continue with Apple".

---

## 7. Verify everything works

Open the live site → **Create account** in the top nav. Try each provider
button. After signing in:

- The top nav avatar should show your name + provider chip.
- Supabase → Table Editor → `tlm_subscribers` shows your email row.
- Supabase → Authentication → Users shows your auth record.
- TLM admin panel (logo × 7, or type `TLMadmin`) → **Sign-ins & subscribers**
  shows the row with provider correctly identified.

That's it.

---

## What I (Claude) can and can't do for you here

I can wire and verify the code (done — `tlm-config.js`, `auth.js`, the SQL,
the admin user table). I **can't**:

- Sign up for Supabase / Google Cloud / Apple Developer / Facebook on your behalf.
  Those services require you to enter your credentials, accept their TOS, and
  in Apple's case pay $99/yr — none of which I can do without literally being
  you.
- Drive your browser through dashboards on a different machine. If you want me
  to walk through Supabase with you live (filling forms while you watch and
  approve), say "drive Supabase in Chrome" and I'll request browser access —
  but you'll still type passwords yourself.

The fastest path is the 7 steps above. I've made them as paste-and-click as
possible — the SQL is one button, the config is two values.
