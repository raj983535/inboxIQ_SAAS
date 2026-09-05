import { NextResponse } from 'next/server';
import { getAuthenticatedAdmin } from '@/lib/clerk/auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { formatSafeErrorResponse } from '@/lib/errors';
import { generateCorrelationId } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function GET() {
  const correlationId = generateCorrelationId();
  try {
    await getAuthenticatedAdmin();

    const { data: workflows, error } = await supabaseAdmin
      .from('workflow_executions')
      .select(`
        id,
        user_id,
        execution_id,
        correlation_id,
        status,
        started_at,
        completed_at,
        duration_ms,
        emails_processed,
        error_category,
        error_message,
        created_at,
        users (email, name)
      `)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;

    return NextResponse.json({ success: true, workflows: workflows || [] });
  } catch (error) {
    const safeError = formatSafeErrorResponse(error, correlationId);
    return NextResponse.json(safeError, { status: safeError.status });
  }
}
