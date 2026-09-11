/**
 * Centralized Administrative Access Engine for InboxIQ
 * 
 * Rules:
 * 1. sahilrajppm2022@gmail.com is unconditionally authorized as the primary Super Administrator.
 * 2. Optional comma-separated emails from ADMIN_EMAILS, ADMIN_EMAIL, or NEXT_PUBLIC_ADMIN_EMAILS are recognized.
 * 3. Works universally in both server environments (Node/Edge API routes) and client browser components.
 */

export const ROOT_ADMIN_EMAIL = 'sahilrajppm2022@gmail.com';

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
  if (normalized === ROOT_ADMIN_EMAIL) {
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

  // Strict Security Rule: User MUST have an email address that matches ROOT_ADMIN_EMAIL
  // or the configured admin email list. A client-side role manipulation ('admin') or
  // an 'is_admin: true' flag is NOT accepted unless the email itself is verified.
  if (user.email && isAuthorizedAdminEmail(user.email)) {
    return true;
  }

  return false;
}
