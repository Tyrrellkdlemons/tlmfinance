# Optional Neon sync (Postgres backup)

**This is off by default. Turning it on weakens the local-only privacy guarantee.** Read this whole page before enabling.

## What it does
A Netlify Function (`netlify/functions/sync.js`) lets a user back up their plan to a Neon Postgres database, keyed by an anonymous, randomly generated `device_key` stored in their browser. No name, no email, no contact info, no IP retention.

The frontend never calls this function unless the user clicks an explicit "Back up to my account" button (you would add this gate to the UI; it is intentionally not wired in by default).

## When you might want it
- A user works across multiple devices (phone + library computer + case-manager office).
- A user wants their plan to survive clearing browser data.
- A counselor wants an opt-in "save to Neon" flow that they walk through with the user.

## When you should not turn it on
- You can't commit to a privacy review and a clear opt-in UI.
- The user population includes anyone whose plan data could be used against them in a parole / housing / employment decision. **In that case keep the site local-only.**

## Setup

1. Create a free Neon project → https://neon.tech
2. Copy the connection string (postgres://...?sslmode=require).
3. In the Neon SQL editor run:

   ```sql
   create table if not exists plans (
     device_key  text primary key,
     plan_json   jsonb not null,
     updated_at  timestamptz not null default now()
   );
   ```

4. In Netlify → Site settings → Environment variables add:
   - `NEON_DATABASE_URL` = your connection string
   - `SYNC_ENABLED` = `true`

5. Wire a UI gate. Suggested: a "Back up to my account" button in the planner that
   - generates a `device_key` once (`crypto.randomUUID()`),
   - stores the key in `localStorage`,
   - shows a clear consent dialog explaining what leaves the device,
   - calls `POST /.netlify/functions/sync` with the plan JSON, and
   - on app load calls `GET /.netlify/functions/sync` to merge.

6. Test locally with `netlify dev` after running `npm install` inside `netlify/functions/`.

## What the schema does NOT include
- No name, email, phone, address, government ID, or DOB columns.
- No request log.
- No third-party analytics.
- No deterministic linking from `device_key` back to a real person — the key is generated client-side and the user can rotate or delete it any time.

## Disabling sync after rollout
Flip `SYNC_ENABLED` to anything other than `true` and the function returns 503. Truncate the `plans` table to remove existing data.
