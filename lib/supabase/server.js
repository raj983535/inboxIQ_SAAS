import { createClient } from '@supabase/supabase-js';
import { validateServerConfig } from '../config/server.js';

validateServerConfig();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!supabaseUrl && process.env.NODE_ENV === 'production' && process.env.IS_TEST_RUNNER !== 'true') {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL is required.');
}

if (!supabaseServiceRoleKey && process.env.NODE_ENV === 'production' && typeof window === 'undefined' && process.env.NEXT_PHASE !== 'phase-production-build' && process.env.IS_TEST_RUNNER !== 'true') {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for server-side operations.');
}

/**
 * Privileged server-side Supabase client.
 * Fail-closed: Never falls back to public anon key or placeholder keys.
 */
export const supabaseAdmin = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseServiceRoleKey || (process.env.NODE_ENV === 'development' || process.env.IS_TEST_RUNNER === 'true' ? 'dev-mock-service-key' : ''),
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);
