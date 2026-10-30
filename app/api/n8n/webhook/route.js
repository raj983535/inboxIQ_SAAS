import { NextResponse } from 'next/server';
import { verifyN8nCallbackAuth } from '@/lib/internal-auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { formatSafeErrorResponse, AppError, ErrorCategories, logSystemError } from '@/lib/errors';
import { generateCorrelationId } from '@/lib/utils';

const VALID_STATUSES = new Set(['completed', 'failed', 'partial', 'success']);
const VALID_DELIVERY_STATUSES = new Set(['delivered', 'failed', 'pending', 'skipped']);
const VALID_DRIVE_STATUSES = new Set(['uploaded', 'failed', 'skipped', 'pending']);
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export async function POST(req) {
  const correlationId = generateCorrelationId();
  try {
    const rawBody = await req.text();
    let payload;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      throw new AppError(ErrorCategories.VALIDATION_ERROR, 'Malformed n8n webhook JSON payload.', 400);
    }

    // 1. Strict Webhook Authentication (Scope: 'webhook' -> N8N_WEBHOOK_SECRET only)
    verifyN8nCallbackAuth(req, rawBody);

    const {
      execution_id,
      user_id,
      report_date,
      status: rawStatus,
      email_delivery_status: rawDeliveryStatus,
      drive_upload_status: rawDriveStatus,
      emails_processed: rawEmailsProcessed,
      duration_ms: rawDurationMs,
      error_category,
      error_message,
      executive_summary,
    } = payload;

    if (!user_id || typeof user_id !== 'string' || !execution_id || typeof execution_id !== 'string') {
      throw new AppError(ErrorCategories.VALIDATION_ERROR, 'Missing or invalid execution_id or user_id in payload.', 400);
    }

    // 2. Schema and Allowlist Validation
    const status = (rawStatus || '').toLowerCase();
    if (!VALID_STATUSES.has(status)) {
      throw new AppError(ErrorCategories.VALIDATION_ERROR, `Invalid execution status: ${rawStatus}`, 400);
    }

    const email_delivery_status = rawDeliveryStatus ? rawDeliveryStatus.toLowerCase() : 'delivered';
    if (!VALID_DELIVERY_STATUSES.has(email_delivery_status)) {
      throw new AppError(ErrorCategories.VALIDATION_ERROR, `Invalid email_delivery_status: ${rawDeliveryStatus}`, 400);
    }

    const drive_upload_status = rawDriveStatus ? rawDriveStatus.toLowerCase() : 'skipped';
    if (!VALID_DRIVE_STATUSES.has(drive_upload_status)) {
      throw new AppError(ErrorCategories.VALIDATION_ERROR, `Invalid drive_upload_status: ${rawDriveStatus}`, 400);
    }

    if (report_date && !DATE_REGEX.test(report_date)) {
      throw new AppError(ErrorCategories.VALIDATION_ERROR, 'Invalid report_date format. Expected YYYY-MM-DD.', 400);
    }

    const emails_processed = Math.max(0, parseInt(rawEmailsProcessed, 10) || 0);
    const duration_ms = Math.max(0, parseInt(rawDurationMs, 10) || 0);

    // 3. Strict Pre-existing Execution Verification
    // A callback is NEVER permitted to synthesize an arbitrary execution record
    const { data: existingExec, error: findExecErr } = await supabaseAdmin
      .from('workflow_executions')
      .select('id, status')
      .eq('execution_id', execution_id)
      .eq('user_id', user_id)
      .maybeSingle();

    if (findExecErr) {
      throw new AppError(ErrorCategories.DATABASE_ERROR, `Failed to verify execution record: ${findExecErr.message}`, 500);
    }

    if (!existingExec) {
      throw new AppError(
        ErrorCategories.VALIDATION_ERROR,
        `Unknown execution '${execution_id}' for user. Callbacks cannot create uninitiated executions.`,
        404
      );
    }

    // 4. Update workflow_executions table strictly by execution_id
    const finalStatus = status === 'partial' || status === 'success' ? 'completed' : status;
    const { error: execErr } = await supabaseAdmin
      .from('workflow_executions')
      .update({
        status: finalStatus,
        completed_at: new Date().toISOString(),
        duration_ms,
        emails_processed,
        error_category: error_category || null,
        error_message: error_message || null,
      })
      .eq('execution_id', execution_id)
      .eq('user_id', user_id);

    if (execErr) {
      throw new AppError(ErrorCategories.DATABASE_ERROR, `Failed to update execution record: ${execErr.message}`, 500);
    }

    // Update durable report_jobs status if job exists
    supabaseAdmin
      .from('report_jobs')
      .update({
        status: finalStatus === 'completed' ? 'completed' : 'failed',
        completed_at: new Date().toISOString(),
        last_error: error_message || null,
      })
      .eq('execution_id', execution_id)
      .then();

    // 5. Update reports metadata table with verified error checking
    if (report_date) {
      const { error: repErr } = await supabaseAdmin
        .from('reports')
        .update({
          status: finalStatus === 'failed' ? 'failed' : 'delivered',
          email_delivery_status,
          drive_upload_status,
          executive_summary: executive_summary || null,
          generated_at: new Date().toISOString(),
        })
        .eq('user_id', user_id)
        .eq('report_date', report_date)
        .eq('report_type', 'daily');

      if (repErr) {
        throw new AppError(ErrorCategories.DATABASE_ERROR, `Failed to update report record: ${repErr.message}`, 500);
      }
    }

    // 6. Log failure if any in system_errors table
    if (finalStatus === 'failed' || error_message) {
      await logSystemError({
        userId: user_id,
        correlationId: payload.correlation_id || correlationId,
        failureCategory: error_category || ErrorCategories.N8N_ERROR,
        errorMessage: error_message || 'Workflow execution reported failure',
        contextData: { execution_id, duration_ms, emails_processed },
      });
    }

    return NextResponse.json({ success: true, execution_id, status: finalStatus });
  } catch (error) {
    const safeError = formatSafeErrorResponse(error, correlationId);
    return NextResponse.json(safeError, { status: safeError.status });
  }
}
