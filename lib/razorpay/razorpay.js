import Razorpay from 'razorpay';
import crypto from 'crypto';
import { AppError, ErrorCategories } from '@/lib/errors';

/**
 * Server-side Razorpay instance initialized strictly with server secrets.
 */
export function getRazorpayClient() {
  const keyId = (process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '').trim();
  const keySecret = (process.env.RAZORPAY_KEY_SECRET || '').trim();

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
  const secret = (process.env.RAZORPAY_WEBHOOK_SECRET || '').trim();
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
 * Validates Razorpay Checkout payment signature for both Subscriptions and Orders.
 * For Subscriptions: HMAC-SHA256(payment_id + "|" + subscription_id, secret)
 * For Orders: HMAC-SHA256(order_id + "|" + payment_id, secret)
 * @param {Object} params
 * @param {string} [params.orderId] - Razorpay order ID
 * @param {string} [params.subscriptionId] - Razorpay subscription ID
 * @param {string} params.paymentId - Razorpay payment ID
 * @param {string} params.signature - Razorpay signature received on frontend
 * @returns {boolean}
 */
export function verifyPaymentSignature({ orderId, subscriptionId, paymentId, signature }) {
  const keySecret = (process.env.RAZORPAY_KEY_SECRET || '').trim();
  if (!keySecret) {
    throw new AppError(
      ErrorCategories.PAYMENT_ERROR,
      'RAZORPAY_KEY_SECRET is not configured on the server.',
      500
    );
  }

  if (!signature || !paymentId) {
    return false;
  }

  // 1. Validate subscription signature format if subscriptionId is present
  if (subscriptionId) {
    const subPayload = `${paymentId}|${subscriptionId}`;
    const expectedSubSig = crypto
      .createHmac('sha256', keySecret)
      .update(subPayload)
      .digest('hex');

    if (
      expectedSubSig.length === signature.length &&
      crypto.timingSafeEqual(Buffer.from(expectedSubSig, 'utf8'), Buffer.from(signature, 'utf8'))
    ) {
      return true;
    }
  }

  // 2. Validate standard order signature format if orderId is present
  if (orderId) {
    const orderPayload = `${orderId}|${paymentId}`;
    const expectedOrderSig = crypto
      .createHmac('sha256', keySecret)
      .update(orderPayload)
      .digest('hex');

    if (
      expectedOrderSig.length === signature.length &&
      crypto.timingSafeEqual(Buffer.from(expectedOrderSig, 'utf8'), Buffer.from(signature, 'utf8'))
    ) {
      return true;
    }
  }

  return false;
}
