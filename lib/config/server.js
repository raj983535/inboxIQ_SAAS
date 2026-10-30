/**
 * Server Configuration & Environment Security Validator
 * Enforces strict production fail-closed invariants categorized by functional domain.
 */

export const CONFIG_CATEGORIES = {
  RUNTIME: [
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'TOKEN_ENCRYPTION_KEY',
    'CRON_SECRET',
    'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
    'CLERK_SECRET_KEY',
  ],
  BILLING: [
    'RAZORPAY_KEY_ID',
    'RAZORPAY_KEY_SECRET',
    'RAZORPAY_WEBHOOK_SECRET',
  ],
  GOOGLE: [
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
  ],
  AUTOMATION: [
    'N8N_BASE_URL',
    'N8N_WEBHOOK_SECRET',
    'INTERNAL_API_SECRET',
  ],
};

let validatedCategories = new Set();

/**
 * Validates environment variables for specified categories or all by default.
 * In production runtime, throws an error if any critical variable is missing or placeholder.
 *
 * @param {string|string[]} [categories='ALL']
 * @returns {boolean}
 */
export function validateServerConfig(categories = 'ALL') {
  if (process.env.NODE_ENV !== 'production') return true;
  if (typeof window !== 'undefined') return true;
  if (process.env.NEXT_PHASE === 'phase-production-build' || process.env.IS_TEST_RUNNER === 'true') return true;

  const catsToCheck =
    categories === 'ALL'
      ? Object.keys(CONFIG_CATEGORIES)
      : Array.isArray(categories)
      ? categories
      : [categories];

  const missing = [];

  for (const cat of catsToCheck) {
    if (validatedCategories.has(cat)) continue;

    const vars = CONFIG_CATEGORIES[cat] || [];
    for (const varName of vars) {
      const val = process.env[varName];
      if (!val || val.includes('placeholder') || val.includes('mock_')) {
        missing.push(`${cat}:${varName}`);
      }
    }

    if (missing.length === 0) {
      validatedCategories.add(cat);
    }
  }

  if (missing.length > 0) {
    const errorMsg = `[ConfigSecurity] Critical production environment configuration missing or using placeholder: ${missing.join(', ')}`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  return true;
}

/**
 * Health check reporter for admin / system diagnostics.
 * Returns structured status without exposing secret values.
 */
export function getServerConfigHealth() {
  const result = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    categories: {},
    allValid: true,
  };

  for (const [cat, vars] of Object.entries(CONFIG_CATEGORIES)) {
    const catStatus = {
      total: vars.length,
      configured: 0,
      missing: [],
      status: 'healthy',
    };

    for (const varName of vars) {
      const val = process.env[varName];
      if (val && !val.includes('placeholder') && !val.includes('mock_')) {
        catStatus.configured++;
      } else {
        catStatus.missing.push(varName);
      }
    }

    if (catStatus.missing.length > 0) {
      catStatus.status = 'degraded';
      result.allValid = false;
    }

    result.categories[cat] = catStatus;
  }

  return result;
}
