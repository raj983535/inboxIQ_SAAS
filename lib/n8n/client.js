import crypto from 'crypto';
import { AppError, ErrorCategories } from '@/lib/errors';
import { generateCorrelationId } from '@/lib/utils';

/**
 * Dispatches an authenticated workflow execution trigger to the external n8n engine.
 * Authenticates using N8N_WEBHOOK_SECRET in request headers.
 */
export async function triggerN8nWorkflow({
  userId,
  userEmail,
  profession = 'professor_teacher',
  country = 'India',
  reportTime,
  timezone,
  gmailConnections,
  driveConnection,
  reportDate = new Date().toISOString().split('T')[0],
  executionId: inputExecutionId,
  correlationId: inputCorrelationId,
}) {
  const rawBaseUrl = process.env.N8N_BASE_URL || 'https://sahilcompany.app.n8n.cloud';
  const n8nBaseUrl = rawBaseUrl.trim().replace(/\/+$/, '');
  const n8nSecret = process.env.N8N_WEBHOOK_SECRET || 'inboxiq_production_orchestration_secret_key_2026';

  if (!n8nBaseUrl) {
    throw new AppError(
      ErrorCategories.CONFIGURATION_ERROR,
      'n8n automation endpoint credentials are not configured.',
      500
    );
  }

  const correlationId = inputCorrelationId || generateCorrelationId();
  const executionId = inputExecutionId || `exec_${crypto.randomBytes(8).toString('hex')}`;

  const payload = {
    correlation_id: correlationId,
    execution_id: executionId,
    user_id: userId,
    user_email: userEmail,
    user_context: {
      profession: profession, // 'professor_teacher' | 'student' | 'others'
      country: country,
    },
    report_date: reportDate,
    schedule: {
      report_time: reportTime,
      timezone: timezone,
    },
    // Minimal connection metadata
    connections: {
      gmail: gmailConnections.map((conn) => ({
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

  const timestamp = Date.now().toString();
  const rawBody = JSON.stringify(payload);
  const signature = crypto
    .createHmac('sha256', n8nSecret)
    .update(`${timestamp}.${rawBody}`)
    .digest('hex');

  try {
    const response = await fetch(`${n8nBaseUrl}/webhook/inboxiq-intelligence-trigger`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-inboxiq-timestamp': timestamp,
        'x-inboxiq-signature': signature,
        'x-correlation-id': correlationId,
      },
      body: rawBody,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`n8n responded with status ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    return {
      success: true,
      correlationId,
      executionId,
      response: data,
    };
  } catch (err) {
    throw new AppError(
      ErrorCategories.N8N_ERROR,
      `n8n execution dispatch failed: ${err.message}`,
      502
    );
  }
}

/**
 * Validates incoming webhook signature from n8n callbacks.
 */
export function verifyN8nWebhookSignature(rawBody, signatureHeader) {
  const n8nSecret = process.env.N8N_WEBHOOK_SECRET || 'inboxiq_production_orchestration_secret_key_2026';
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

