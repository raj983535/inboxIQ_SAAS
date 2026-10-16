/**
 * Server Configuration & Environment Security Validator
 * Enforces strict production fail-closed invariants.
 */

const REQUIRED_PRODUCTION_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'TOKEN_ENCRYPTION_KEY',
  'CRON_SECRET',
];

let validated = false;

export function validateServerConfig() {
  if (validated) return true;
  if (process.env.NODE_ENV !== 'production') return true;
  if (typeof window !== 'undefined') return true;
  if (process.env.NEXT_PHASE === 'phase-production-build') return true;

  const missing = [];
  for (const varName of REQUIRED_PRODUCTION_VARS) {
    if (!process.env[varName] || process.env[varName].includes('placeholder')) {
      missing.push(varName);
    }
  }

  if (missing.length > 0) {
    const errorMsg = `[ConfigSecurity] Critical production environment configuration missing or using placeholder: ${missing.join(', ')}`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  validated = true;
  return true;
}
