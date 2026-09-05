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

    const { data: errors, error } = await supabaseAdmin
      .from('system_errors')
      .select(`
        id,
        user_id,
        correlation_id,
        failure_category,
        error_status,
        error_message,
        context_data,
        resolved_at,
        created_at,
        users (email, name)
      `)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;

    return NextResponse.json({ success: true, errors: errors || [] });
  } catch (error) {
    const safeError = formatSafeErrorResponse(error, correlationId);
    return NextResponse.json(safeError, { status: safeError.status });
  }
}
