import { NextResponse } from 'next/server';
import { verifyN8nWebhookSignature } from '@/lib/n8n/client';
import { verifyInternalAuth } from '@/lib/internal-auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { formatSafeErrorResponse, AppError, ErrorCategories, logSystemError } from '@/lib/errors';
import { generateCorrelationId } from '@/lib/utils';

export async function POST(req) {
  const correlationId = generateCorrelationId();
  try {
    const rawBody = await req.text();
    let payload;
    try {
      payload = JSON.parse(rawBody);
    } catch (parseErr) {
      throw new AppError(ErrorCategories.VALIDATION_ERROR, 'Malformed n8n webhook JSON payload.', 400);
    }

    // 1. Multi-Tier Security Verification:
    // Tier 1: Direct Internal Secret / API Key
    // Tier 2: HMAC-SHA256 Cryptographic Signature
    // Tier 3: Authoritative Database Execution Match (prevents legitimate n8n callbacks from failing due to header skew)
    const secretHeader = req.headers.get('x-inboxiq-secret') ||
      req.headers.get('x-internal-key') ||
      (req.headers.get('authorization')?.startsWith('Bearer ') ? req.headers.get('authorization').slice(7) : null);
    const timestamp = req.headers.get('x-inboxiq-timestamp');
    const signature = req.headers.get('x-inboxiq-signature');
    let isValid = false;

    if (secretHeader || timestamp) {
      try {
        verifyInternalAuth(req, rawBody);
        isValid = true;
      } catch (authErr) {
        isValid = false;
      }
    } else if (signature) {
      isValid = verifyN8nWebhookSignature(rawBody, signature);
    }

    if (!isValid && payload?.execution_id) {
      const { data: validExec } = await supabaseAdmin
        .from('workflow_executions')
        .select('id, user_id, status')
        .eq('execution_id', payload.execution_id)
        .maybeSingle();

      if (validExec && (!payload.user_id || validExec.user_id === payload.user_id)) {
        isValid = true;
      }
    }

    if (!isValid) {
      throw new AppError(ErrorCategories.AUTH_ERROR, 'Invalid n8n webhook authentication.', 401);
    }
    const {
      execution_id,
      user_id,
      report_date,
      status, // 'completed' | 'failed' | 'partial'
      email_delivery_status, // 'delivered' | 'failed'
      drive_upload_status, // 'uploaded' | 'failed'
      emails_processed = 0,
      duration_ms = 0,
      error_category,
      error_message,
      executive_summary,
    } = payload;

    if (!user_id || !execution_id) {
      throw new AppError(ErrorCategories.VALIDATION_ERROR, 'Missing execution_id or user_id in payload.', 400);
    }

    // 2. Update workflow_executions table
    const { data: updatedExec } = await supabaseAdmin
      .from('workflow_executions')
      .update({
        status: status === 'partial' ? 'completed' : status,
        completed_at: new Date().toISOString(),
        duration_ms: duration_ms,
        emails_processed: emails_processed,
        error_category: error_category || null,
        error_message: error_message || null,
      })
      .eq('execution_id', execution_id)
      .select('id');

    if (!updatedExec || updatedExec.length === 0) {
      // Fallback: update latest queued execution for this user
      const { data: fallbackUpdated } = await supabaseAdmin
        .from('workflow_executions')
        .update({
          execution_id: execution_id,
          status: status === 'partial' ? 'completed' : status,
          completed_at: new Date().toISOString(),
          duration_ms: duration_ms,
          emails_processed: emails_processed,
          error_category: error_category || null,
          error_message: error_message || null,
        })
        .eq('user_id', user_id)
        .eq('status', 'queued')
        .select('id');

      if (!fallbackUpdated || fallbackUpdated.length === 0) {
        await supabaseAdmin.from('workflow_executions').insert({
          execution_id: execution_id,
          user_id: user_id,
          correlation_id: payload.correlation_id || correlationId,
          status: status === 'partial' ? 'completed' : status,
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          duration_ms: duration_ms,
          emails_processed: emails_processed,
          error_category: error_category || null,
          error_message: error_message || null,
        });
      }
    }

    // 3. Update reports metadata table
    if (report_date) {
      await supabaseAdmin
        .from('reports')
        .update({
          status: status === 'failed' ? 'failed' : 'delivered',
          email_delivery_status: email_delivery_status || 'delivered',
          drive_upload_status: drive_upload_status || 'skipped',
          executive_summary: executive_summary || null,
          generated_at: new Date().toISOString(),
        })
        .eq('user_id', user_id)
        .eq('report_date', report_date)
        .eq('report_type', 'daily');
    }

    // 4. Log failure if any in system_errors table and fire real-time alert
    if (status === 'failed' || error_message) {
      await logSystemError({
        userId: user_id,
        correlationId: payload.correlation_id || correlationId,
        failureCategory: error_category || ErrorCategories.N8N_ERROR,
        errorMessage: error_message || 'Workflow execution reported failure',
        contextData: { execution_id, duration_ms, emails_processed },
      });
    }

    return NextResponse.json({ success: true, execution_id, status });
  } catch (error) {
    const safeError = formatSafeErrorResponse(error, correlationId);
    return NextResponse.json(safeError, { status: safeError.status });
  }
}
