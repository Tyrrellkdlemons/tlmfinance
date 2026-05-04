/**
 * Supabase Client Export for Pathways Home
 * =========================================
 * Wraps the existing tlm-config.js and creates Supabase client
 */

// Import Supabase from CDN
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Load config from tlm-config.js (global window object)
await import('./tlm-config.js');

// Get config from window
const config = window.__TLM_CONFIG || {};

if (!config.supabaseUrl || !config.supabaseAnonKey) {
  console.error('❌ Supabase config not found in window.__TLM_CONFIG');
  throw new Error('Missing Supabase configuration');
}

// Create and export Supabase client
export const supabaseClient = createClient(
  config.supabaseUrl,
  config.supabaseAnonKey,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  }
);

// Export config for convenience
export const supabaseConfig = {
  url: config.supabaseUrl,
  anonKey: config.supabaseAnonKey
};

console.log('✅ Supabase client initialized');
