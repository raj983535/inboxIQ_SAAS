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

    const [{ data: gmailConnections, error: gError }, { data: driveConnections, error: dError }] = await Promise.all([
      supabaseAdmin
        .from('gmail_connections')
        .select('id, user_id, account_email, provider, connection_name, connection_slot, status, last_connected_at, last_error, created_at, users(email, name)')
        .order('created_at', { ascending: false }),
      supabaseAdmin
        .from('google_drive_connections')
        .select('id, user_id, account_email, status, inboxiq_folder_id, reports_folder_id, last_connected_at, last_error, created_at, users(email, name)')
        .order('created_at', { ascending: false }),
    ]);

    if (gError) throw gError;
    if (dError) throw dError;

    return NextResponse.json({
      success: true,
      gmail_connections: gmailConnections || [],
      drive_connections: driveConnections || [],
    });
  } catch (error) {
    const safeError = formatSafeErrorResponse(error, correlationId);
    return NextResponse.json(safeError, { status: safeError.status });
  }
}
