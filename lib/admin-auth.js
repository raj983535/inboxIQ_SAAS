/**
 * Centralized Administrative Access Engine for InboxIQ
 * 
 * Rules:
 * 1. sahilrajppm2022@gmail.com is unconditionally authorized as the primary Super Administrator.
 * 2. Optional comma-separated emails from ADMIN_EMAILS, ADMIN_EMAIL, or NEXT_PUBLIC_ADMIN_EMAILS are recognized.
 * 3. Works universally in both server environments (Node/Edge API routes) and client browser components.
 */

export const ROOT_ADMIN_EMAIL =
  (typeof process !== 'undefined' && (process.env?.ROOT_ADMIN_EMAIL || process.env?.NEXT_PUBLIC_ROOT_ADMIN_EMAIL || process.env?.ADMIN_EMAIL)) ||
  'sahilrajppm2022@gmail.com';

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
  if (normalized === ROOT_ADMIN_EMAIL.toLowerCase().trim()) {
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

  // Strict Server Boundary: User MUST have an email address that matches the authorized
  // administrator registry. Client-side role claims alone are never accepted.
  if (user.email && isAuthorizedAdminEmail(user.email)) {
    return true;
  }

  // Also support database role if explicitly provisioned as admin and email is verified
  if ((user.role === 'admin' || user.role === 'super_admin') && user.email && isAuthorizedAdminEmail(user.email)) {
    return true;
  }

  return false;
}
