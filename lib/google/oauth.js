import { google } from 'googleapis';
import crypto from 'crypto';
import { AppError, ErrorCategories } from '@/lib/errors';

export const GOOGLE_SCOPES = {
  GMAIL: [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
  ],
  DRIVE: [
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/userinfo.email',
  ],
};

export function getGoogleOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL || 'https://inboxiq.online'}/api/google/callback`;

  if (!clientId || !clientSecret) {
    throw new AppError(
      ErrorCategories.CONFIGURATION_ERROR,
      'Google OAuth credentials are missing in server environment.',
      500
    );
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

/**
 * Generates a tamper-proof signed OAuth state parameter for CSRF prevention.
 */
export function generateOAuthState({ userId, type, slot = 1 }) {
  const secret = process.env.TOKEN_ENCRYPTION_KEY || 'oauth-state-secret-key';
  const payload = JSON.stringify({
    userId,
    type, // 'gmail' | 'drive'
    slot: Number(slot),
    nonce: crypto.randomBytes(8).toString('hex'),
    timestamp: Date.now(),
  });

  const hmac = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  const stateString = Buffer.from(JSON.stringify({ payload, hmac })).toString('base64url');
  return stateString;
}

/**
 * Validates the OAuth state parameter, checking HMAC signature and expiration (15 minutes).
 */
export function verifyOAuthState(stateString) {
  try {
    const secret = process.env.TOKEN_ENCRYPTION_KEY || 'oauth-state-secret-key';
    const decoded = JSON.parse(Buffer.from(stateString, 'base64url').toString('utf8'));
    const { payload, hmac } = decoded;

    const expectedHmac = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    if (hmac !== expectedHmac) {
      throw new Error('OAuth state HMAC signature mismatch.');
    }

    const data = JSON.parse(payload);
    // Expire state after 15 minutes
    if (Date.now() - data.timestamp > 15 * 60 * 1000) {
      throw new Error('OAuth state has expired. Please try connecting again.');
    }

    return data;
  } catch (err) {
    throw new AppError(
      ErrorCategories.AUTH_ERROR,
      `Invalid OAuth State: ${err.message}`,
      400
    );
  }
}
