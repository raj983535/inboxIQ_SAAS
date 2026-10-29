import crypto from 'crypto';
import { AppError, ErrorCategories } from './errors.js';

// 5 minutes max clock skew / replay window
const MAX_TIMESTAMP_AGE_MS = 5 * 60 * 1000;

/**
 * Validates a candidate secret against an expected secret in constant time.
 */
function secureCompare(candidate, expected) {
  if (!candidate || !expected) return false;
  if (typeof candidate !== 'string' || typeof expected !== 'string') return false;
  if (candidate.length !== expected.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(candidate, 'utf8'), Buffer.from(expected, 'utf8'));
  } catch {
    return false;
  }
}

/**
 * Extracts candidate token/secret from standard internal headers.
 */
function extractCandidateToken(req) {
  const secretHeader =
    req.headers.get('x-inboxiq-secret') ||
    req.headers.get('x-internal-key') ||
    (req.headers.get('authorization')?.startsWith('Bearer ')
      ? req.headers.get('authorization').slice(7)
      : null);
  return secretHeader;
}

/**
 * Verifies authentication for internal control-plane endpoints with strict scoped trust boundaries.
 * 
 * Scopes:
 * - 'cron': Accepts ONLY CRON_SECRET (used by /api/cron/dispatch)
 * - 'webhook': Accepts ONLY N8N_WEBHOOK_SECRET / N8N_CALLBACK_SECRET (used by /api/n8n/webhook)
 * - 'internal': Accepts ONLY INTERNAL_API_SECRET (used by /api/internal/*)
 * - 'any': Default fallback, checks configured scoped secret
 *
 * @param {Request} req - Next.js incoming Request object
 * @param {string} [rawBody=''] - Raw unparsed text of request body
 * @param {object} [options={}] - Options including { scope }
 * @returns {object} { correlationId, timestamp }
 */
export function verifyInternalAuth(req, rawBody = '', options = {}) {
  const scope = options.scope || 'any';
  const correlationId = req.headers.get('x-correlation-id') || `corr_${Date.now()}`;
  const candidateToken = extractCandidateToken(req);

  // 1. CRON Scope: Must match CRON_SECRET only
  if (scope === 'cron') {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      throw new AppError(
        ErrorCategories.CONFIGURATION_ERROR,
        'CRON_SECRET is not configured on the server.',
        500
      );
    }
    if (secureCompare(candidateToken, cronSecret)) {
      return { correlationId, timestamp: Date.now() };
    }
    throw new AppError(
      ErrorCategories.AUTH_ERROR,
      'Unauthorized: Invalid CRON_SECRET credentials.',
      401
    );
  }

  // 2. INTERNAL Scope (Gmail/Drive internal APIs): Must match INTERNAL_API_SECRET only
  if (scope === 'internal') {
    const internalSecret = process.env.INTERNAL_API_SECRET;
    if (!internalSecret) {
      throw new AppError(
        ErrorCategories.CONFIGURATION_ERROR,
        'INTERNAL_API_SECRET is not configured on the server.',
        500
      );
    }
    if (secureCompare(candidateToken, internalSecret)) {
      return { correlationId, timestamp: Date.now() };
    }
    throw new AppError(
      ErrorCategories.AUTH_ERROR,
      'Unauthorized: Invalid INTERNAL_API_SECRET credentials.',
      401
    );
  }

  // 3. WEBHOOK Scope (n8n Webhook Callbacks): Must match N8N_WEBHOOK_SECRET via HMAC or direct secret
  if (scope === 'webhook') {
    const webhookSecret = process.env.N8N_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new AppError(
        ErrorCategories.CONFIGURATION_ERROR,
        'N8N_WEBHOOK_SECRET is not configured on the server.',
        500
      );
    }

    // Direct token comparison against N8N_WEBHOOK_SECRET only
    if (candidateToken && secureCompare(candidateToken, webhookSecret)) {
      return { correlationId, timestamp: Date.now() };
    }

    // Cryptographic HMAC-SHA256 signature verification
    const signature = req.headers.get('x-inboxiq-signature');
    const timestampStr = req.headers.get('x-inboxiq-timestamp');
    if (signature && timestampStr) {
      const timestamp = Number(timestampStr);
      if (isNaN(timestamp) || timestamp <= 0) {
        throw new AppError(ErrorCategories.AUTH_ERROR, 'Malformed x-inboxiq-timestamp header.', 401);
      }
      if (Math.abs(Date.now() - timestamp) > MAX_TIMESTAMP_AGE_MS) {
        throw new AppError(
          ErrorCategories.AUTH_ERROR,
          'Request timestamp is expired or outside valid tolerance window (Replay Protection).',
          401
        );
      }

      const stringToSign = `${timestampStr}.${rawBody}`;
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(stringToSign)
        .digest('hex');

      if (
        signature.length === expectedSignature.length &&
        crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expectedSignature, 'hex'))
      ) {
        return { correlationId, timestamp };
      }
    }

    throw new AppError(
      ErrorCategories.AUTH_ERROR,
      'Unauthorized: Invalid n8n webhook authentication. Cryptographic signature or authorized N8N_WEBHOOK_SECRET required.',
      401
    );
  }

  // Default / ANY scope: Verify against configured secrets without mixing unauthorized paths
  const configuredWebhookSecret = process.env.N8N_WEBHOOK_SECRET;
  const configuredInternalSecret = process.env.INTERNAL_API_SECRET;
  const configuredCronSecret = process.env.CRON_SECRET;

  const validSecrets = [
    configuredWebhookSecret,
    configuredInternalSecret,
    configuredCronSecret,
  ].filter(Boolean);

  if (validSecrets.length === 0) {
    throw new AppError(
      ErrorCategories.CONFIGURATION_ERROR,
      'Internal control-plane secrets are not configured on the server.',
      500
    );
  }

  if (candidateToken) {
    for (const secret of validSecrets) {
      if (secureCompare(candidateToken, secret)) {
        return { correlationId, timestamp: Date.now() };
      }
    }
  }

  // HMAC-SHA256 Signature Auth
  const signature = req.headers.get('x-inboxiq-signature');
  const timestampStr = req.headers.get('x-inboxiq-timestamp');

  if (signature && timestampStr && configuredWebhookSecret) {
    const timestamp = Number(timestampStr);
    if (isNaN(timestamp) || timestamp <= 0) {
      throw new AppError(ErrorCategories.AUTH_ERROR, 'Malformed x-inboxiq-timestamp header.', 401);
    }
    if (Math.abs(Date.now() - timestamp) > MAX_TIMESTAMP_AGE_MS) {
      throw new AppError(
        ErrorCategories.AUTH_ERROR,
        'Request timestamp is expired or outside valid tolerance window (Replay Protection).',
        401
      );
    }

    const stringToSign = `${timestampStr}.${rawBody}`;
    const expectedSignature = crypto
      .createHmac('sha256', configuredWebhookSecret)
      .update(stringToSign)
      .digest('hex');

    if (
      signature.length === expectedSignature.length &&
      crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expectedSignature, 'hex'))
    ) {
      return { correlationId, timestamp };
    }
  }

  throw new AppError(
    ErrorCategories.AUTH_ERROR,
    'Missing or invalid internal security credentials (x-inboxiq-secret or x-inboxiq-signature).',
    401
  );
}

/**
 * Dedicated auth helper for /api/cron/dispatch
 */
export function verifyCronAuth(req) {
  return verifyInternalAuth(req, '', { scope: 'cron' });
}

/**
 * Dedicated auth helper for /api/n8n/webhook
 */
export function verifyN8nCallbackAuth(req, rawBody) {
  return verifyInternalAuth(req, rawBody, { scope: 'webhook' });
}

/**
 * Dedicated auth helper for /api/internal/*
 */
export function verifyInternalApiAuth(req) {
  return verifyInternalAuth(req, '', { scope: 'internal' });
}

/**
 * Generates headers for outbound calls from Next.js to n8n or internal endpoints.
 */
export function signInternalPayload(payload) {
  const secret = process.env.N8N_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error('N8N_WEBHOOK_SECRET is not configured.');
  }

  const rawBody = typeof payload === 'string' ? payload : JSON.stringify(payload);
  const timestamp = Date.now().toString();
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${rawBody}`)
    .digest('hex');

  return {
    'Content-Type': 'application/json',
    'x-inboxiq-timestamp': timestamp,
    'x-inboxiq-signature': signature,
  };
}
