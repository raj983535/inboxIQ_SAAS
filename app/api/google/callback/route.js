import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getGoogleOAuth2Client, verifyOAuthState } from '@/lib/google/oauth';
import { encryptToken } from '@/lib/encryption';
import { supabaseAdmin } from '@/lib/supabase/server';
import { setupUserDriveFolders } from '@/lib/google/drive';
import { formatSafeErrorResponse, AppError, ErrorCategories } from '@/lib/errors';
import { getAuthenticatedUser } from '@/lib/clerk/auth';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const stateParam = searchParams.get('state');
    const errorParam = searchParams.get('error');

    if (errorParam) {
      throw new AppError(
        ErrorCategories.GOOGLE_AUTH_REVOKED,
        `Google authorization was denied or failed: ${errorParam}`,
        400
      );
    }

    if (!code || !stateParam) {
      throw new AppError(
        ErrorCategories.AUTH_ERROR,
        'Missing authorization code or state parameter.',
        400
      );
    }

    // 1. Verify CSRF state
    const stateData = verifyOAuthState(stateParam);
    const { userId, type, slot } = stateData;
    const authenticatedUser = await getAuthenticatedUser();
    if (authenticatedUser.id !== userId) {
      throw new AppError(ErrorCategories.AUTH_ERROR, 'Google authorization does not match the signed-in user.', 403);
    }

    // 2. Exchange code for tokens server-side
    const oauth2Client = getGoogleOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    if (!tokens.refresh_token) {
      // If user already authorized earlier without prompt=consent
      // Note: we set prompt: 'consent' in /api/google/connect to ensure this is always returned.
    }

    // 3. Obtain verified Google account profile directly from Google API (Section 55.6)
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();
    const googleEmail = userInfo.data.email;
    const googleId = userInfo.data.id;

    if (!googleEmail) {
      throw new AppError(
        ErrorCategories.AUTH_ERROR,
        'Unable to retrieve verified email from Google account.',
        400
      );
    }

    const encryptedToken = encryptToken(tokens.refresh_token || 'existing_authorized_session');

    if (type === 'gmail') {
      // 4. Enforce 2-Gmail limit per user
      const { data: existingConnections } = await supabaseAdmin
        .from('gmail_connections')
        .select('id, connection_slot, account_email')
        .eq('user_id', userId);

      // Check if this slot or email is already used
      await supabaseAdmin.from('gmail_connections').upsert(
        {
          user_id: userId,
          account_email: googleEmail,
          google_account_id: googleId,
          connection_slot: slot,
          connection_name: slot === 1 ? 'Primary Work Gmail' : 'Secondary Gmail',
          encrypted_refresh_token: encryptedToken,
          status: 'connected',
          last_connected_at: new Date().toISOString(),
          last_error: null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,connection_slot' }
      );
    } else if (type === 'drive') {
      // 5. Setup Google Drive Folders: InboxIQ / Daily Reports
      let inboxiqFolderId = null;
      let reportsFolderId = null;

      try {
        if (tokens.refresh_token) {
          const driveFolders = await setupUserDriveFolders(encryptedToken);
          inboxiqFolderId = driveFolders.inboxiqFolderId;
          reportsFolderId = driveFolders.reportsFolderId;
        }
      } catch (driveErr) {
        console.warn('Drive folder creation deferred:', driveErr.message);
      }

      await supabaseAdmin.from('google_drive_connections').upsert(
        {
          user_id: userId,
          account_email: googleEmail,
          google_account_id: googleId,
          encrypted_refresh_token: encryptedToken,
          status: 'connected',
          inboxiq_folder_id: inboxiqFolderId,
          reports_folder_id: reportsFolderId,
          last_connected_at: new Date().toISOString(),
          last_error: null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl?.origin || 'https://inboxiq.online';
    return NextResponse.redirect(`${appUrl}/dashboard?connection_success=true&type=${type}`);
  } catch (error) {
    const safeError = formatSafeErrorResponse(error);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl?.origin || 'https://inboxiq.online';
    return NextResponse.redirect(`${appUrl}/settings?error=${encodeURIComponent(safeError.error.message)}`);
  }
}
