import crypto from 'crypto';
import { AppError, ErrorCategories } from '@/lib/errors';

// 5 minutes max clock skew / replay window
const MAX_TIMESTAMP_AGE_MS = 5 * 60 * 1000;

/**
 * Verifies HMAC-SHA256 signature for internal control plane endpoints.
 * Signature format: HMAC-SHA256(timestamp + "." + rawBody, N8N_WEBHOOK_SECRET)
 * 
 * Required Headers:
 * - x-inboxiq-timestamp: Unix timestamp in ms or ISO string
 * - x-inboxiq-signature: Hex HMAC signature
 * - x-correlation-id: Valid UUID or correlation string
 *
 * @param {Request} req - Next.js incoming Request object
 * @param {string} rawBody - Raw unparsed text of request body
 * @returns {object} { correlationId, timestamp }
 */
export function verifyInternalAuth(req, rawBody) {
  const configuredSecret = process.env.N8N_WEBHOOK_SECRET;
  if (!configuredSecret) {
    throw new AppError(
      ErrorCategories.CONFIGURATION_ERROR,
      'N8N_WEBHOOK_SECRET is not configured. Internal authentication cannot proceed.',
      500
    );
  }

  const correlationId = req.headers.get('x-correlation-id') || `corr_${Date.now()}`;
  const secretHeader = req.headers.get('x-inboxiq-secret') ||
    (req.headers.get('authorization')?.startsWith('Bearer ') ? req.headers.get('authorization').slice(7) : null);

  // 1. Direct Secret / API Key Auth (Primary & most reliable for n8n Cloud HTTP requests)
  if (secretHeader) {
    if (secretHeader.length === configuredSecret.length) {
      try {
        if (crypto.timingSafeEqual(Buffer.from(secretHeader, 'utf8'), Buffer.from(configuredSecret, 'utf8'))) {
          return {
            correlationId,
            timestamp: Date.now(),
          };
        }
      } catch (e) {
        // ignore comparison errors
      }
    }
  }

  // 2. HMAC-SHA256 Signature Auth (Fallback for cryptographically signed webhooks)
  const signature = req.headers.get('x-inboxiq-signature');
  const timestampStr = req.headers.get('x-inboxiq-timestamp');

  if (signature && timestampStr) {
    // Parse and validate timestamp
    const timestamp = Number(timestampStr);
    if (isNaN(timestamp) || timestamp <= 0) {
      throw new AppError(
        ErrorCategories.AUTH_ERROR,
        'Malformed x-inboxiq-timestamp header.',
        401
      );
    }

    const now = Date.now();
    if (Math.abs(now - timestamp) > MAX_TIMESTAMP_AGE_MS) {
      throw new AppError(
        ErrorCategories.AUTH_ERROR,
        'Request timestamp is expired or outside valid tolerance window (Replay Protection).',
        401
      );
    }

    // Constant-time HMAC verification against configuredSecret
    const stringToSign = `${timestampStr}.${rawBody}`;
    const expectedSignature = crypto
      .createHmac('sha256', configuredSecret)
      .update(stringToSign)
      .digest('hex');

    try {
      if (
        signature.length === expectedSignature.length &&
        crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expectedSignature, 'hex'))
      ) {
        return {
          correlationId,
          timestamp,
        };
      }
    } catch (err) {
      // HMAC comparison error
    }

    throw new AppError(
      ErrorCategories.AUTH_ERROR,
      'Invalid internal HMAC-SHA256 signature.',
      401
    );
  }

  throw new AppError(
    ErrorCategories.AUTH_ERROR,
    'Missing or invalid internal security credentials (x-inboxiq-secret or x-inboxiq-signature).',
    401
  );
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
