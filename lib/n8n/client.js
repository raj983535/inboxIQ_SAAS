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
  const rawBaseUrl = process.env.N8N_BASE_URL || 'https://axiaracompany.app.n8n.cloud';
  let n8nBaseUrl = rawBaseUrl.trim().replace(/\/+$/, '');
  // Sanitize obsolete or deleted workspaces configured in hosting environment variables
  if (n8nBaseUrl.includes('sahilcompany.app.n8n.cloud')) {
    n8nBaseUrl = 'https://axiaracompany.app.n8n.cloud';
  }
  try {
    const parsed = new URL(n8nBaseUrl.startsWith('http') ? n8nBaseUrl : `https://${n8nBaseUrl}`);
    n8nBaseUrl = parsed.origin;
  } catch {
    n8nBaseUrl = n8nBaseUrl.replace(/\/workflow\/.*$/, '').replace(/\/webhook\/.*$/, '');
  }
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

  const fetchWithRetry = async (url, options, retries = 3) => {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, options);
        if (!response.ok) {
          const errorText = await response.text();
          const isHibernating = response.status === 404 && (errorText.includes('No workspace here') || errorText.includes('workspace'));
          const isTransientServerError = [500, 502, 503, 504].includes(response.status);

          // Retry on transient server errors or hibernating n8n Cloud workspace waking up
          if (attempt < retries && (isTransientServerError || isHibernating)) {
            const delay = (attempt + 1) * 4000; // 4s, 8s, 12s progressive backoff
            console.warn(`[n8n] ${isHibernating ? 'Workspace hibernating/waking up (404)' : `Server error ${response.status}`}, retrying in ${delay / 1000}s (attempt ${attempt + 1}/${retries + 1})...`);
            await new Promise(r => setTimeout(r, delay));
            continue;
          }
          throw new Error(`n8n responded with status ${response.status}: ${errorText}`);
        }
        return response;
      } catch (err) {
        if (attempt < retries && (err.cause?.code === 'ECONNRESET' || err.cause?.code === 'ETIMEDOUT' || err.cause?.code === 'ECONNREFUSED' || err.name === 'TimeoutError')) {
          const delay = (attempt + 1) * 4000;
          console.warn(`[n8n] Network error ${err.cause?.code || err.name}, retrying in ${delay / 1000}s (attempt ${attempt + 1}/${retries + 1})...`);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }
        throw err;
      }
    }
  };

  try {
    const response = await fetchWithRetry(`${n8nBaseUrl}/webhook/inboxiq-intelligence-trigger`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-inboxiq-timestamp': timestamp,
        'x-inboxiq-signature': signature,
        'x-correlation-id': correlationId,
      },
      body: rawBody,
    });

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

