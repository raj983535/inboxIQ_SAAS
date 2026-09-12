/**
 * Standardized classified system error definitions & safe client sanitization
 */

export const ErrorCategories = {
  AUTH_ERROR: 'AUTH_ERROR',
  GOOGLE_AUTH_REVOKED: 'GOOGLE_AUTH_REVOKED',
  GMAIL_API_ERROR: 'GMAIL_API_ERROR',
  DRIVE_API_ERROR: 'DRIVE_API_ERROR',
  GEMINI_ERROR: 'GEMINI_ERROR',
  N8N_ERROR: 'N8N_ERROR',
  PDF_ERROR: 'PDF_ERROR',
  EMAIL_DELIVERY_ERROR: 'EMAIL_DELIVERY_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  PAYMENT_ERROR: 'PAYMENT_ERROR',
  CONFIGURATION_ERROR: 'CONFIGURATION_ERROR',
  RATE_LIMIT_ERROR: 'RATE_LIMIT_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
};

export class AppError extends Error {
  constructor(category, message, statusCode = 500, details = null) {
    super(message);
    this.category = category;
    this.statusCode = statusCode;
    this.details = details;
  }
}

/**
 * Produces a sanitized, safe response object for client consumption without leaking stack traces or internal secrets.
 */
export function formatSafeErrorResponse(error, correlationId = null) {
  const isAppError = error instanceof AppError;
  const category = isAppError ? error.category : ErrorCategories.DATABASE_ERROR;
  const statusCode = isAppError ? error.statusCode : 500;
  
  // Safe messages for production
  let publicMessage = error.message || 'An unexpected error occurred. Please try again.';
  
  // Mask sensitive database or internal runtime errors
  if (publicMessage.includes('violates foreign key') || publicMessage.includes('duplicate key') || publicMessage.includes('JWT') || publicMessage.includes('relation "')) {
    publicMessage = 'A database integrity operation failed.';
  }

  return {
    success: false,
    error: {
      category,
      message: publicMessage,
      correlationId: correlationId || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'req-err'),
    },
    status: statusCode,
  };
}

/**
 * Centrally records system failures into Supabase and dispatches an alert
 * if ADMIN_ALERT_WEBHOOK_URL (Discord / Slack / Telegram) is configured.
 */
export async function logSystemError({
  failureCategory = ErrorCategories.DATABASE_ERROR,
  errorMessage,
  userId = null,
  correlationId = null,
  contextData = {},
  errorStatus = 'unresolved',
}) {
  try {
    const { supabaseAdmin } = await import('@/lib/supabase/server');
    if (supabaseAdmin) {
      await supabaseAdmin.from('system_errors').insert({
        failure_category: failureCategory,
        error_message: errorMessage || 'Unspecified system error',
        user_id: userId,
        correlation_id: correlationId,
        context_data: contextData,
        error_status: errorStatus,
      });
    }

    // Proactive Real-time Alerting via Webhook (Discord / Slack / Webhook)
    const alertWebhookUrl = process.env.ADMIN_ALERT_WEBHOOK_URL;
    if (alertWebhookUrl && (alertWebhookUrl.startsWith('http://') || alertWebhookUrl.startsWith('https://'))) {
      const alertPayload = {
        content: `🚨 **[InboxIQ System Alert]**\n**Category:** \`${failureCategory}\`\n**Message:** ${errorMessage}\n**User ID:** \`${userId || 'N/A'}\`\n**Correlation:** \`${correlationId || 'N/A'}\``,
        text: `🚨 [InboxIQ System Alert] Category: ${failureCategory} | Error: ${errorMessage}`,
      };
      fetch(alertWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(alertPayload),
      }).catch((e) => console.error('Failed to post webhook alert:', e.message));
    }
  } catch (err) {
    console.error('Failed to record system error:', err.message);
  }
}
