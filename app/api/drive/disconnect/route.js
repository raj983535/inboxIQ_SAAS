import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/clerk/auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { formatSafeErrorResponse, AppError, ErrorCategories } from '@/lib/errors';
import { generateCorrelationId } from '@/lib/utils';

export async function POST(req) {
  const correlationId = generateCorrelationId();
  try {
    const user = await getAuthenticatedUser();
    const { id } = await req.json();

    // Verify ownership
    const { data: driveConn, error: findError } = await supabaseAdmin
      .from('google_drive_connections')
      .select('id, user_id')
      .eq('user_id', user.id)
      .single();

    if (findError || !driveConn) {
      throw new AppError(ErrorCategories.AUTH_ERROR, 'Drive connection not found.', 404);
    }

    const { error: deleteError } = await supabaseAdmin
      .from('google_drive_connections')
      .delete()
      .eq('user_id', user.id);

    if (deleteError) {
      throw new AppError(ErrorCategories.DATABASE_ERROR, 'Failed to disconnect Google Drive.', 500);
    }

    return NextResponse.json({ success: true, message: 'Google Drive disconnected successfully.' });
  } catch (error) {
    const safeError = formatSafeErrorResponse(error, correlationId);
    return NextResponse.json(safeError, { status: safeError.status });
  }
}
