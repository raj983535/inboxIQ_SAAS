import Razorpay from 'razorpay';
import crypto from 'crypto';
import { AppError, ErrorCategories } from '@/lib/errors';

/**
 * Server-side Razorpay instance initialized strictly with server secrets.
 */
export function getRazorpayClient() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new AppError(
      ErrorCategories.PAYMENT_ERROR,
      'Razorpay credentials are not configured on the server.',
      500
    );
  }

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
}

/**
 * Validates Razorpay Webhook signature using HMAC-SHA256 against raw request payload.
 * @param {string} rawBody - Raw unparsed request body string
 * @param {string} signature - x-razorpay-signature header
 * @returns {boolean}
 */
export function verifyRazorpayWebhookSignature(rawBody, signature) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    throw new AppError(
      ErrorCategories.PAYMENT_ERROR,
      'RAZORPAY_WEBHOOK_SECRET is not configured on the server.',
      500
    );
  }

  if (!signature) {
    return false;
  }

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature, 'utf8'),
    Buffer.from(signature, 'utf8')
  );
}
