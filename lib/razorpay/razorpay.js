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

/**
 * Validates Razorpay Standard Checkout payment signature.
 * HMAC-SHA256(order_id + "|" + payment_id, RAZORPAY_KEY_SECRET)
 * @param {Object} params
 * @param {string} params.orderId - Razorpay order ID (e.g. order_xxx)
 * @param {string} params.paymentId - Razorpay payment ID (e.g. pay_xxx)
 * @param {string} params.signature - Razorpay signature received on frontend
 * @returns {boolean}
 */
export function verifyPaymentSignature({ orderId, paymentId, signature }) {
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) {
    throw new AppError(
      ErrorCategories.PAYMENT_ERROR,
      'RAZORPAY_KEY_SECRET is not configured on the server.',
      500
    );
  }

  if (!orderId || !paymentId || !signature) {
    return false;
  }

  const payload = `${orderId}|${paymentId}`;
  const expectedSignature = crypto
    .createHmac('sha256', keySecret)
    .update(payload)
    .digest('hex');

  if (expectedSignature.length !== signature.length) {
    return false;
  }

  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature, 'utf8'),
    Buffer.from(signature, 'utf8')
  );
}
