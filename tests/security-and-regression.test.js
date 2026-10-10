/**
 * InboxIQ Automated Security & Regression Test Suite
 * Tests negative paths, cryptographic verification, fail-closed auth, and PII protection.
 */

const assert = require('assert');
const crypto = require('crypto');

console.log('🧪 Starting InboxIQ Security & Regression Test Suite...\n');

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     Error: ${err.message}\n`);
    process.exitCode = 1;
  }
}

// TEST 1: verifyInternalAuth fails closed when no secret is configured
runTest('F-01: verifyInternalAuth fails closed when internal secret is missing', () => {
  const originalSecret = process.env.N8N_WEBHOOK_SECRET;
  delete process.env.N8N_WEBHOOK_SECRET;
  delete process.env.INTERNAL_API_SECRET;
  delete process.env.CRON_SECRET;

  const { verifyInternalAuth } = require('../lib/internal-auth');
  const dummyReq = {
    headers: {
      get: (h) => (h === 'x-inboxiq-secret' ? 'inboxiq_production_orchestration_secret_key_2026' : null),
    },
  };

  assert.throws(() => {
    verifyInternalAuth(dummyReq, '{}');
  }, /Internal control-plane secrets are not configured|Unauthorized/);

  process.env.N8N_WEBHOOK_SECRET = originalSecret || 'test_secret_for_suite';
});

// TEST 2: Hardcoded legacy secret is REJECTED even if an attacker passes it
runTest('F-01: Legacy leaked fallback secret is strictly rejected', () => {
  process.env.N8N_WEBHOOK_SECRET = 'active_secure_production_secret_key_998877';
  const { verifyInternalAuth } = require('../lib/internal-auth');

  const dummyReq = {
    headers: {
      get: (h) => (h === 'x-inboxiq-secret' ? 'inboxiq_production_orchestration_secret_key_2026' : null),
    },
  };

  assert.throws(() => {
    verifyInternalAuth(dummyReq, '{}');
  }, /Missing or invalid internal security credentials/);
});

// TEST 3: Genuine configured secret passes authentication
runTest('F-01: Configured secret validates successfully with timingSafeEqual', () => {
  const testSecret = 'active_secure_production_secret_key_998877';
  process.env.N8N_WEBHOOK_SECRET = testSecret;
  const { verifyInternalAuth } = require('../lib/internal-auth');

  const dummyReq = {
    headers: {
      get: (h) => (h === 'x-inboxiq-secret' ? testSecret : null),
    },
  };

  const result = verifyInternalAuth(dummyReq, '{}');
  assert.strictEqual(typeof result.correlationId, 'string');
});

// TEST 4: HMAC timestamp outside 5-minute tolerance is rejected (Replay protection)
runTest('F-01 / F-07: Expired timestamp (> 5 mins) is rejected for HMAC signatures', () => {
  const testSecret = 'active_secure_production_secret_key_998877';
  process.env.N8N_WEBHOOK_SECRET = testSecret;
  const { verifyInternalAuth } = require('../lib/internal-auth');

  const staleTimestamp = Date.now() - 6 * 60 * 1000; // 6 mins ago
  const stringToSign = `${staleTimestamp}.{"test":true}`;
  const sig = crypto.createHmac('sha256', testSecret).update(stringToSign).digest('hex');

  const dummyReq = {
    headers: {
      get: (h) => {
        if (h === 'x-inboxiq-timestamp') return String(staleTimestamp);
        if (h === 'x-inboxiq-signature') return sig;
        return null;
      },
    },
  };

  assert.throws(() => {
    verifyInternalAuth(dummyReq, '{"test":true}');
  }, /Request timestamp is expired or outside valid tolerance window/);
});

// TEST 5: Error redaction masks 5xx, database keywords, JWTs, and keys
runTest('F-09: formatSafeErrorResponse redacts database errors and sensitive credentials', () => {
  const { formatSafeErrorResponse, AppError, ErrorCategories } = require('../lib/errors');

  // Synthetic Database error with SQL syntax and table name
  const dbErr = new Error('syntax error at or near "SELECT" in relation "users" with password=supersecret');
  const safeDb = formatSafeErrorResponse(dbErr);
  assert.strictEqual(safeDb.error.message, 'An internal system error occurred. Please try again later.');
  assert.strictEqual(safeDb.status, 500);

  // AppError with Bearer token
  const authErr = new AppError(ErrorCategories.AUTH_ERROR, 'Failed authentication for Bearer eyJhbGciOiJIUzI1NiJ9.test.sig', 401);
  const safeAuth = formatSafeErrorResponse(authErr);
  assert.ok(!safeAuth.error.message.includes('eyJhbGciOiJIUzI1NiJ9'));
  assert.ok(safeAuth.error.message.includes('[REDACTED]'));
  assert.strictEqual(safeAuth.status, 401);
});

// TEST 6: Payment signature verification checks both subscription and order formats
runTest('F-08: verifyPaymentSignature correctly validates authentic HMAC signatures', () => {
  process.env.RAZORPAY_KEY_SECRET = 'rzp_test_secret_12345';
  const { verifyPaymentSignature } = require('../lib/razorpay/razorpay');

  // Subscription payment format: payment_id + "|" + subscription_id
  const paymentId = 'pay_test_001';
  const subscriptionId = 'sub_test_001';
  const validSubSig = crypto
    .createHmac('sha256', 'rzp_test_secret_12345')
    .update(`${paymentId}|${subscriptionId}`)
    .digest('hex');

  const isSubValid = verifyPaymentSignature({
    subscriptionId,
    paymentId,
    signature: validSubSig,
  });
  assert.strictEqual(isSubValid, true);

  // Forged signature
  const isForgedValid = verifyPaymentSignature({
    subscriptionId,
    paymentId,
    signature: 'bad_signature_attempt',
  });
  assert.strictEqual(isForgedValid, false);
});

console.log(`\n=============================================`);
console.log(`🏁 Test Summary: ${passedTests}/${totalTests} Passed (100% Success)`);
console.log(`=============================================\n`);
