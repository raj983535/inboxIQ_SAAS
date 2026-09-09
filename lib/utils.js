import crypto from 'crypto';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function generateCorrelationId() {
  return `req_${crypto.randomBytes(8).toString('hex')}_${Date.now()}`;
}

export function generateExecutionId() {
  return `exec_${crypto.randomBytes(10).toString('hex')}`;
}

/**
 * Standard IANA timezones commonly used
 */
export const IANA_TIMEZONES = [
  { value: 'Asia/Kolkata', label: 'India Standard Time (Asia/Kolkata, UTC+5:30)' },
  { value: 'America/New_York', label: 'Eastern Time (America/New_York, UTC-5/UTC-4)' },
  { value: 'America/Chicago', label: 'Central Time (America/Chicago, UTC-6/UTC-5)' },
  { value: 'America/Denver', label: 'Mountain Time (America/Denver, UTC-7/UTC-6)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (America/Los_Angeles, UTC-8/UTC-7)' },
  { value: 'Europe/London', label: 'UK Time (Europe/London, UTC+0/UTC+1)' },
  { value: 'Europe/Paris', label: 'Central European Time (Europe/Paris, UTC+1/UTC+2)' },
  { value: 'Asia/Dubai', label: 'Gulf Standard Time (Asia/Dubai, UTC+4)' },
  { value: 'Asia/Singapore', label: 'Singapore Time (Asia/Singapore, UTC+8)' },
  { value: 'Asia/Tokyo', label: 'Japan Standard Time (Asia/Tokyo, UTC+9)' },
  { value: 'Australia/Sydney', label: 'Australian Eastern Time (Australia/Sydney, UTC+10/UTC+11)' },
];

/**
 * Validates whether a timezone identifier is a valid standard IANA timezone.
 */
export function isValidIanaTimezone(timezone) {
  if (!timezone || typeof timezone !== 'string' || timezone.trim().length === 0 || timezone.length > 100) {
    return false;
  }
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone.trim() });
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * In-memory token bucket rate limiter for sensitive endpoints
 */
const rateLimitMap = new Map();

export function checkRateLimit(key, limit = 20, windowMs = 60000) {
  const now = Date.now();
  const record = rateLimitMap.get(key) || { count: 0, resetAt: now + windowMs };

  if (now > record.resetAt) {
    record.count = 1;
    record.resetAt = now + windowMs;
    rateLimitMap.set(key, record);
    return { allowed: true, remaining: limit - 1, resetAt: record.resetAt };
  }

  if (record.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: record.resetAt };
  }

  record.count += 1;
  rateLimitMap.set(key, record);
  return { allowed: true, remaining: limit - record.count, resetAt: record.resetAt };
}
