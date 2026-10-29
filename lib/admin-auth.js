/**
 * Centralized Administrative Access Engine for InboxIQ
 * 
 * Rules:
 * 1. Root Super Admin email is configured via ROOT_ADMIN_EMAIL or ADMIN_EMAIL environment variables.
 * 2. Optional comma-separated emails from ADMIN_EMAILS or NEXT_PUBLIC_ADMIN_EMAILS are recognized.
 * 3. Server-side role authorization checks Clerk/database user roles ('admin' or 'super_admin').
 * 4. No personal emails are hardcoded in source files.
 */

export const ROOT_ADMIN_EMAIL =
  (typeof process !== 'undefined' &&
    (process.env?.ROOT_ADMIN_EMAIL || process.env?.ADMIN_EMAIL || process.env?.NEXT_PUBLIC_ROOT_ADMIN_EMAIL)) ||
  '';

/**
 * Checks whether an email address belongs to an authorized system administrator.
 * Case-insensitive, whitespace-trimmed matching.
 * 
 * @param {string} [email]
 * @returns {boolean}
 */
export function isAuthorizedAdminEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const normalized = email.toLowerCase().trim();

  // Root Super Admin check
  if (ROOT_ADMIN_EMAIL && normalized === ROOT_ADMIN_EMAIL.toLowerCase().trim()) {
    return true;
  }

  // Environment-configured additional admin list
  const envAdmins = (
    (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_ADMIN_EMAILS) ||
    (typeof process !== 'undefined' && process.env?.ADMIN_EMAILS) ||
    (typeof process !== 'undefined' && process.env?.ADMIN_EMAIL) ||
    ''
  )
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  return envAdmins.includes(normalized);
}

export function checkIsAdmin(user) {
  if (!user || typeof user !== 'object') return false;

  // Direct database role check (primary security invariant)
  if (user.role === 'admin' || user.role === 'super_admin') {
    return true;
  }

  // Authorized email match
  if (user.email && isAuthorizedAdminEmail(user.email)) {
    return true;
  }

  return false;
}
