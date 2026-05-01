# Environment Variables

## Required for Local Development: NONE ✅

The TLM Finance site works **completely standalone** with zero configuration!

- **Supabase credentials**: Hardcoded in `src/tlm-config.js` (safe - it's the public anon key with Row-Level Security)
- **Local development**: Just open `index.html` or run a server
- **All features work**: No `.env` file needed

---

## Netlify Functions (Server-Side Only)

Environment variables are **only needed on Netlify** for serverless functions. These are set in:

**Netlify Dashboard → Site Settings → Environment Variables**

See [`.env.example`](../.env.example) for a template with all variables.

---

## Variable Reference

### Required Variables

| Variable | Function | Purpose | Where to Get |
|----------|----------|---------|--------------|
| `OPENROUTER_API_KEY` | `chat.js` | Enables AI chatbot | [openrouter.ai/keys](https://openrouter.ai/keys) (free) |

**Without this:** The chatbot will not work. All other site features work normally.

---

### Optional Variables

#### Email Notifications

| Variable | Function | Purpose | Where to Get |
|----------|----------|---------|--------------|
| `RESEND_API_KEY` | `notify.js`, `newsletter.js` | Email notifications and newsletter | [resend.com](https://resend.com) |

**Features:**
- Admin notifications when users sign up
- Newsletter subscriber management
- Email confirmations

**Without this:** Email features disabled, site works normally.

---

#### SMS Notifications (Twilio)

| Variable | Function | Purpose | Where to Get |
|----------|----------|---------|--------------|
| `TWILIO_ACCOUNT_SID` | `notify.js` | Twilio account identifier | [twilio.com/console](https://www.twilio.com/console) |
| `TWILIO_AUTH_TOKEN` | `notify.js` | Twilio authentication token | [twilio.com/console](https://www.twilio.com/console) |
| `TWILIO_FROM_NUMBER` | `notify.js` | Phone number to send from (e.g., `+1234567890`) | [twilio.com/console](https://www.twilio.com/console) |

**Features:**
- SMS notifications to admin on user sign-ups
- Text alerts for important events

**Without this:** SMS features disabled, site works normally.

---

#### Database Sync (Neon)

| Variable | Function | Purpose | Where to Get |
|----------|----------|---------|--------------|
| `NEON_DATABASE_URL` | `sync.js` | PostgreSQL connection string | [neon.tech](https://neon.tech) |
| `SYNC_ENABLED` | `sync.js` | Set to `"true"` to enable sync | N/A - set manually |

**Features:**
- Syncs data to Neon Postgres database
- Additional backup beyond Supabase
- Advanced analytics queries

**Format:** `postgresql://user:password@host/database?sslmode=require`

**Without this:** Neon sync disabled, Supabase still works for primary storage.

---

#### Text-to-Speech (ElevenLabs)

| Variable | Function | Purpose | Where to Get |
|----------|----------|---------|--------------|
| `ELEVENLABS_API_KEY` | `voice.js` | API authentication | [elevenlabs.io](https://elevenlabs.io) |
| `ELEVENLABS_VOICE_ID` | `voice.js` | Voice profile ID (optional) | ElevenLabs dashboard |
| `ELEVENLABS_MODEL_ID` | `voice.js` | TTS model ID (optional) | ElevenLabs dashboard |

**Features:**
- Text-to-speech conversion
- Audio generation for content
- Voice narration

**Without this:** Voice features disabled, site works normally.

---

#### OpenRouter Customization (Optional)

| Variable | Function | Purpose | Default |
|----------|----------|---------|---------|
| `OPENROUTER_REFERRER` | `chat.js` | HTTP Referer header | `https://tlmfinance.netlify.app` |
| `OPENROUTER_TITLE` | `chat.js` | App title in OpenRouter logs | `TLM Finance` |

**Features:**
- Customizes how your app appears in OpenRouter analytics
- Helps track API usage

**Without this:** Uses defaults, chatbot still works.

---

### Auto-Set Variables (Don't Touch)

These are automatically provided by Netlify:

| Variable | Function | Purpose |
|----------|----------|---------|
| `NETLIFY_API_TOKEN` | `newsletter.js` | Netlify API authentication |
| `NETLIFY_SITE_ID` | `newsletter.js` | Site identifier |

**Do not set these manually** - Netlify injects them at runtime.

---

## Setup Guide

### Quick Start (Minimum Viable)

1. **Local Development**: No setup needed! ✅
2. **Deploy to Netlify**: Add just one variable:
   ```
   OPENROUTER_API_KEY = your_free_key_from_openrouter_ai
   ```
3. **Done!** Your site is fully functional.

---

### Full Setup (All Features)

If you want email, SMS, database sync, and voice features:

1. **Copy `.env.example`** (for reference only - don't create a `.env` file)
2. **Get API keys** from each service:
   - OpenRouter (required for chatbot)
   - Resend (for email)
   - Twilio (for SMS)
   - Neon (for database sync)
   - ElevenLabs (for voice)
3. **Add to Netlify**:
   - Go to: **Site Settings → Environment Variables**
   - Add each key/value pair
   - Save and redeploy

---

## Security Best Practices

### ✅ DO:
- Store API keys in Netlify environment variables
- Use the least privileged keys possible
- Rotate keys periodically
- Monitor API usage for anomalies

### ❌ DON'T:
- Never commit `.env` files to Git
- Never expose service role keys (only anon keys)
- Never share API keys in screenshots or documentation
- Never use production keys for testing

---

## Troubleshooting

### Chatbot not working
- **Check**: `OPENROUTER_API_KEY` is set in Netlify
- **Verify**: Key is valid at [openrouter.ai/keys](https://openrouter.ai/keys)
- **Test**: Try a free model like `meta-llama/llama-3.2-3b-instruct:free`

### Email not sending
- **Check**: `RESEND_API_KEY` is set
- **Verify**: Domain is verified in Resend dashboard
- **Test**: Send a test email from Resend console

### SMS not sending
- **Check**: All three Twilio variables are set
- **Verify**: Phone number format includes country code: `+1234567890`
- **Test**: Send test SMS from Twilio console

### Database sync failing
- **Check**: `NEON_DATABASE_URL` is set
- **Check**: `SYNC_ENABLED=true` is set
- **Verify**: Database exists and connection string is correct
- **Test**: Connect with `psql` or database client

---

## Functions Reference

### `chat.js` - AI Chatbot

**Required:**
- `OPENROUTER_API_KEY`

**Optional:**
- `OPENROUTER_REFERRER`
- `OPENROUTER_TITLE`

**Fallback behavior:** If key is missing, function returns error. Chatbot widget shows "Service unavailable."

---

### `notify.js` - Notifications

**Optional:**
- `RESEND_API_KEY` (email)
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` (SMS)

**Fallback behavior:** If keys missing, notifications silently skip. No errors shown to users.

---

### `newsletter.js` - Newsletter

**Required:**
- `NETLIFY_API_TOKEN` (auto-set)
- `NETLIFY_SITE_ID` (auto-set)

**Optional:**
- `RESEND_API_KEY` (for sending emails)

**Fallback behavior:** Subscribers stored in Netlify Forms. Emails require `RESEND_API_KEY`.

---

### `sync.js` - Database Sync

**Required:**
- `NEON_DATABASE_URL`
- `SYNC_ENABLED=true`

**Fallback behavior:** If either missing, function returns early with no sync.

---

### `voice.js` - Text-to-Speech

**Required:**
- `ELEVENLABS_API_KEY`

**Optional:**
- `ELEVENLABS_VOICE_ID` (defaults to built-in)
- `ELEVENLABS_MODEL_ID` (defaults to built-in)

**Fallback behavior:** If key missing, function returns error. Voice features disabled.

---

## Cost Estimates

All services have generous free tiers:

| Service | Free Tier | Paid Plans Start At |
|---------|-----------|---------------------|
| **OpenRouter** | Free models (13 available) | $0/month (pay per use) |
| **Resend** | 100 emails/day | $20/month (10k emails) |
| **Twilio** | Trial credits | ~$0.0075/SMS |
| **Neon** | 0.5 GB storage, 1 compute | $19/month (hobby) |
| **ElevenLabs** | 10k characters/month | $5/month (30k chars) |

**For typical usage** (small site, <100 users/month):
- **Free tier works!** OpenRouter free models + no paid services needed
- **Upgrade when**: >100 emails/day or need premium AI models

---

## Questions?

See the main [README.md](../README.md) or check the [scripts/README.md](../scripts/README.md) for deployment workflows.
