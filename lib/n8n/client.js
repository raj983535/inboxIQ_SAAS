import crypto from 'crypto';
import { AppError, ErrorCategories } from '@/lib/errors';
import { generateCorrelationId } from '@/lib/utils';
import { executeNativeIntelligencePipeline } from '@/lib/n8n/native-engine';

/**
 * Dispatches an authenticated workflow execution trigger to the external n8n engine,
 * with automatic fail-safe execution via the Native InboxIQ Intelligence Engine if n8n Cloud
 * is offline, expired (404 - No workspace here), or returns a 5xx error.
 */
export async function triggerN8nWorkflow({
  userId,
  userEmail,
  profession = 'professor_teacher',
  country = 'India',
  reportTime,
  timezone,
  gmailConnections = [],
  driveConnection = null,
  reportDate = new Date().toISOString().split('T')[0],
  executionId: inputExecutionId,
  correlationId: inputCorrelationId,
}) {
  const correlationId = inputCorrelationId || generateCorrelationId();
  const executionId = inputExecutionId || `exec_${crypto.randomBytes(8).toString('hex')}`;

  const rawBaseUrl = process.env.N8N_BASE_URL || 'https://axiaracompany.app.n8n.cloud';
  let n8nBaseUrl = rawBaseUrl.trim().replace(/\/+$/, '');
  if (n8nBaseUrl.includes('sahilcompany.app.n8n.cloud')) {
    n8nBaseUrl = 'https://axiaracompany.app.n8n.cloud';
  }
  try {
    const parsed = new URL(n8nBaseUrl.startsWith('http') ? n8nBaseUrl : `https://${n8nBaseUrl}`);
    n8nBaseUrl = parsed.origin;
  } catch {
    n8nBaseUrl = n8nBaseUrl.replace(/\/workflow\/.*$/, '').replace(/\/webhook\/.*$/, '');
  }
  const n8nSecret = process.env.N8N_WEBHOOK_SECRET || process.env.INTERNAL_API_SECRET || process.env.CRON_SECRET;

  const payload = {
    correlation_id: correlationId,
    execution_id: executionId,
    user_id: userId,
    user_email: userEmail,
    user_context: {
      profession: profession,
      country: country,
    },
    report_date: reportDate,
    schedule: {
      report_time: reportTime,
      timezone: timezone,
    },
    connections: {
      gmail: (gmailConnections || []).map((conn) => ({
        id: conn.id,
        slot: conn.connection_slot,
        email: conn.account_email,
        status: conn.status,
      })),
      drive: driveConnection
        ? {
            id: driveConnection.id,
            email: driveConnection.account_email,
            reports_folder_id: driveConnection.reports_folder_id,
          }
        : null,
    },
    timestamp: new Date().toISOString(),
  };

  if (n8nBaseUrl && n8nSecret) {
    try {
      const timestamp = Date.now().toString();
      const rawBody = JSON.stringify(payload);
      const signature = crypto
        .createHmac('sha256', n8nSecret)
        .update(`${timestamp}.${rawBody}`)
        .digest('hex');

      const response = await fetch(`${n8nBaseUrl}/webhook/inboxiq-intelligence-trigger`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-inboxiq-timestamp': timestamp,
          'x-inboxiq-signature': signature,
          'x-correlation-id': correlationId,
        },
        body: rawBody,
        signal: AbortSignal.timeout(8000),
      });

      if (response.ok) {
        const resText = await response.text();
        let data;
        try {
          data = JSON.parse(resText);
        } catch {
          data = { message: resText };
        }

        return {
          success: true,
          correlationId,
          executionId,
          response: data,
        };
      }

      const errorText = await response.text().catch(() => '');
      console.warn(
        `[n8n] External n8n endpoint returned status ${response.status} (${errorText.slice(0, 120)}). Failing over to Native InboxIQ Intelligence Engine...`
      );
    } catch (n8nErr) {
      console.warn(
        `[n8n] External n8n endpoint unreachable (${n8nErr.message}). Failing over to Native InboxIQ Intelligence Engine...`
      );
    }
  }

  // Automatic Fail-Safe: Execute the full pipeline natively inside Next.js
  try {
    const nativeRes = await executeNativeIntelligencePipeline({
      userId,
      userEmail,
      profession,
      timezone,
      reportDate,
      executionId,
      correlationId,
    });

    return {
      success: true,
      correlationId,
      executionId,
      response: nativeRes,
    };
  } catch (err) {
    throw new AppError(
      ErrorCategories.N8N_ERROR,
      `Intelligence pipeline execution failed: ${err.message}`,
      502
    );
  }
}

/**
 * Validates incoming webhook signature from n8n callbacks.
 */
export function verifyN8nWebhookSignature(rawBody, signatureHeader) {
  const n8nSecret = process.env.N8N_WEBHOOK_SECRET;
  if (!n8nSecret || !signatureHeader) return false;

  const expectedSignature = crypto
    .createHmac('sha256', n8nSecret)
    .update(rawBody)
    .digest('hex');

  const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
  const signatureBuffer = Buffer.from(signatureHeader, 'utf8');

  if (expectedBuffer.length !== signatureBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
}

