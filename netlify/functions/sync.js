/**
 * Optional Neon Postgres sync — Netlify Function (Node 20).
 *
 * IMPORTANT — privacy:
 *   The default Paving the Road experience is local-only. This function is
 *   disabled unless the SYNC_ENABLED env var is "true". Even when enabled,
 *   each user opts in explicitly from the planner UI and provides their own
 *   anonymous device key. We do not collect names, addresses, or contact info.
 *
 * Required env vars (set in Netlify → Site settings → Environment variables):
 *   - NEON_DATABASE_URL   postgres://...neon.tech/...?sslmode=require
 *   - SYNC_ENABLED        "true" to allow writes
 *
 * Schema (run once in Neon SQL editor):
 *
 *   create table if not exists plans (
 *     device_key  text primary key,
 *     plan_json   jsonb not null,
 *     updated_at  timestamptz not null default now()
 *   );
 */

import { neon } from '@neondatabase/serverless';

const ok = (body)  => ({ statusCode: 200, headers: cors(), body: JSON.stringify(body) });
const bad = (msg)  => ({ statusCode: 400, headers: cors(), body: JSON.stringify({ error: msg }) });
const off = ()     => ({ statusCode: 503, headers: cors(), body: JSON.stringify({ error: 'sync disabled' }) });
const cors = () => ({
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type, x-device-key',
  'Content-Type': 'application/json'
});

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors(), body: '' };
  if (process.env.SYNC_ENABLED !== 'true') return off();
  if (!process.env.NEON_DATABASE_URL) return off();

  const sql = neon(process.env.NEON_DATABASE_URL);
  const deviceKey = (event.headers['x-device-key'] || '').slice(0, 80);
  if (!/^[a-zA-Z0-9_-]{16,80}$/.test(deviceKey)) return bad('invalid device key');

  try {
    if (event.httpMethod === 'GET') {
      const rows = await sql`select plan_json, updated_at from plans where device_key = ${deviceKey}`;
      return ok(rows[0] || null);
    }
    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      if (!body || typeof body !== 'object') return bad('expected JSON plan object');
      // Light sanity cap — plans are tiny; reject anything > 64 KB to avoid abuse.
      if (JSON.stringify(body).length > 64 * 1024) return bad('plan too large');
      await sql`
        insert into plans (device_key, plan_json, updated_at)
        values (${deviceKey}, ${body}, now())
        on conflict (device_key) do update set plan_json = excluded.plan_json, updated_at = excluded.updated_at
      `;
      return ok({ saved: true });
    }
    return bad('method not allowed');
  } catch (e) {
    return { statusCode: 500, headers: cors(), body: JSON.stringify({ error: e.message }) };
  }
}
