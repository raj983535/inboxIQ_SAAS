import { NextResponse } from 'next/server';
import { verifyN8nWebhookSignature } from '@/lib/n8n/client';
import { verifyInternalAuth } from '@/lib/internal-auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { formatSafeErrorResponse, AppError, ErrorCategories } from '@/lib/errors';
import { generateCorrelationId } from '@/lib/utils';

export async function POST(req) {
  const correlationId = generateCorrelationId();
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-inboxiq-signature');

    // 1. Signature & Timestamp Verification
    const timestamp = req.headers.get('x-inboxiq-timestamp');
    let isValid = false;
    if (timestamp) {
      try {
        verifyInternalAuth(req, rawBody);
        isValid = true;
      } catch (authErr) {
        isValid = false;
      }
    } else {
      isValid = verifyN8nWebhookSignature(rawBody, signature);
    }
    if (!isValid) {
      throw new AppError(ErrorCategories.AUTH_ERROR, 'Invalid n8n webhook signature.', 401);
    }

    let payload;
    try {
      payload = JSON.parse(rawBody);
    } catch (parseErr) {
      throw new AppError(ErrorCategories.VALIDATION_ERROR, 'Malformed n8n webhook JSON payload.', 400);
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
    await supabaseAdmin
      .from('workflow_executions')
      .update({
        status: status === 'partial' ? 'completed' : status,
        completed_at: new Date().toISOString(),
        duration_ms: duration_ms,
        emails_processed: emails_processed,
        error_category: error_category || null,
        error_message: error_message || null,
      })
      .eq('execution_id', execution_id);

    // 3. Update reports metadata table
    if (report_date) {
      await supabaseAdmin
        .from('reports')
        .update({
          status: status === 'failed' ? 'failed' : 'delivered',
          email_delivery_status: email_delivery_status || 'delivered',
          drive_upload_status: drive_upload_status || 'uploaded',
          executive_summary: executive_summary || null,
          generated_at: new Date().toISOString(),
        })
        .eq('user_id', user_id)
        .eq('report_date', report_date);
    }

    // 4. Log failure if any in system_errors table
    if (status === 'failed' || error_message) {
      await supabaseAdmin.from('system_errors').insert({
        user_id: user_id,
        correlation_id: payload.correlation_id || correlationId,
        failure_category: error_category || ErrorCategories.N8N_ERROR,
        error_status: 'unresolved',
        error_message: error_message || 'Workflow execution reported failure',
        context_data: { execution_id, duration_ms, emails_processed },
      });
    }

    return NextResponse.json({ success: true, execution_id, status });
  } catch (error) {
    const safeError = formatSafeErrorResponse(error, correlationId);
    return NextResponse.json(safeError, { status: safeError.status });
  }
}
