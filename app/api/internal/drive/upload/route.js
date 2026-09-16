import { NextResponse } from 'next/server';
import { verifyInternalAuth } from '@/lib/internal-auth';
import { formatSafeErrorResponse, AppError, ErrorCategories } from '@/lib/errors';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  let correlationId = 'unknown';
  try {
    const rawBody = await req.text();
    const auth = verifyInternalAuth(req, rawBody);
    correlationId = auth.correlationId;

    // Graceful non-blocking no-op: Google Drive archival is disabled in favor of Gmail-only delivery.
    return NextResponse.json({
      success: true,
      uploaded: false,
      status: 'skipped',
      message: 'Google Drive archival is disabled. Reports are delivered directly to Gmail.',
    });
  } catch (error) {
    // Return safe 200 response to prevent breaking any legacy workflow node
    console.warn(`[DriveUpload] Google Drive upload stub bypassed for correlation ${correlationId}:`, error.message);
    return NextResponse.json({
      success: true,
      uploaded: false,
      status: 'skipped',
      message: error.message || 'Google Drive archival skipped.',
    });
  }
}
