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

    if (!id) {
      throw new AppError(ErrorCategories.VALIDATION_ERROR, 'Missing connection ID.', 400);
    }

    // Explicit user ownership check per Section 55.3
    const { data: connection, error: findError } = await supabaseAdmin
      .from('gmail_connections')
      .select('id, user_id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (findError || !connection) {
      throw new AppError(ErrorCategories.AUTH_ERROR, 'Connection not found or access denied.', 404);
    }

    // Delete or mark disconnected and wipe token
    const { error: deleteError } = await supabaseAdmin
      .from('gmail_connections')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (deleteError) {
      throw new AppError(ErrorCategories.DATABASE_ERROR, 'Failed to disconnect Gmail account.', 500);
    }

    return NextResponse.json({ success: true, message: 'Gmail connection removed successfully.' });
  } catch (error) {
    const safeError = formatSafeErrorResponse(error, correlationId);
    return NextResponse.json(safeError, { status: safeError.status });
  }
}
