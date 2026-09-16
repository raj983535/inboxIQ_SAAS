import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/clerk/auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { getGoogleOAuth2Client, GOOGLE_SCOPES, generateOAuthState } from '@/lib/google/oauth';
import { formatSafeErrorResponse, AppError, ErrorCategories } from '@/lib/errors';
import { checkRateLimit } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    const user = await getAuthenticatedUser();

    // Rate limiting: Max 10 Google connect initiations per minute per user
    const rateLimit = checkRateLimit(`google_connect_${user.id}`, 10, 60000);
    if (!rateLimit.allowed) {
      throw new AppError(ErrorCategories.RATE_LIMIT_ERROR, 'Too many connection attempts. Please wait a moment.', 429);
    }

    const { searchParams } = new URL(req.url);

    const type = searchParams.get('type') || 'gmail'; // 'gmail' only
    const slot = parseInt(searchParams.get('slot') || '1', 10);

    if (type === 'drive') {
      // Gracefully redirect legacy drive connection requests back to settings
      return NextResponse.redirect(new URL('/settings', req.url));
    }

    if (type !== 'gmail') {
      throw new AppError(ErrorCategories.VALIDATION_ERROR, 'Invalid connection type requested. Only Gmail is supported.', 400);
    }

    if (slot !== 1 && slot !== 2) {
      throw new AppError(ErrorCategories.VALIDATION_ERROR, 'Invalid Gmail connection slot. Must be 1 or 2.', 400);
    }

    const oauth2Client = getGoogleOAuth2Client();
    const scopes = GOOGLE_SCOPES.GMAIL;

    const state = generateOAuthState({
      userId: user.id,
      type,
      slot,
    });

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline', // Requests refresh_token
      prompt: 'consent', // Force consent so refresh_token is always returned
      scope: scopes,
      state: state,
      include_granted_scopes: true,
    });

    return NextResponse.redirect(authUrl);
  } catch (error) {
    const safeError = formatSafeErrorResponse(error);
    return NextResponse.json(safeError, { status: safeError.status });
  }
}
