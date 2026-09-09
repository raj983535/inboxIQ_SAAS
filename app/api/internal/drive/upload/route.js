import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { Readable } from 'stream';
import { verifyInternalAuth } from '@/lib/internal-auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { decryptToken } from '@/lib/encryption';
import { getGoogleOAuth2Client } from '@/lib/google/oauth';
import { formatSafeErrorResponse, AppError, ErrorCategories } from '@/lib/errors';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  let correlationId = 'unknown';
  try {
    const rawBody = await req.text();
    const auth = verifyInternalAuth(req, rawBody);
    correlationId = auth.correlationId;

    let body;
    try {
      body = JSON.parse(rawBody);
    } catch (e) {
      throw new AppError(ErrorCategories.VALIDATION_ERROR, 'Malformed JSON body.', 400);
    }

    const { user_id, execution_id, pdf_base64, file_name } = body;

    if (!user_id || typeof user_id !== 'string') {
      throw new AppError(ErrorCategories.VALIDATION_ERROR, 'Missing or invalid user_id.', 400);
    }
    if (!pdf_base64 || !file_name) {
      throw new AppError(ErrorCategories.VALIDATION_ERROR, 'pdf_base64 and file_name are required.', 400);
    }

    // 1. Sanitize file name to prevent path traversal
    const sanitizedFileName = file_name.replace(/[^a-zA-Z0-9._-]/g, '_');

    // 2. Resolve Drive Connection strictly belonging to user_id
    const { data: driveConn, error: driveErr } = await supabaseAdmin
      .from('google_drive_connections')
      .select('id, encrypted_refresh_token, reports_folder_id, status')
      .eq('user_id', user_id)
      .maybeSingle();

    if (driveErr || !driveConn || driveConn.status !== 'connected' || !driveConn.encrypted_refresh_token) {
      return NextResponse.json({
        success: true,
        uploaded: false,
        status: 'skipped',
        message: 'Google Drive is not connected for this user.',
      });
    }

    // 3. Server-side token decryption & Google Drive Client
    const refreshToken = decryptToken(driveConn.encrypted_refresh_token);
    const oauth2Client = getGoogleOAuth2Client();
    oauth2Client.setCredentials({ refresh_token: refreshToken });

    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    // 4. Convert Base64 into stream
    const pdfBuffer = Buffer.from(pdf_base64, 'base64');
    const stream = new Readable();
    stream.push(pdfBuffer);
    stream.push(null);

    const targetFolderId = driveConn.reports_folder_id || undefined;
    const fileMetadata = {
      name: sanitizedFileName,
      parents: targetFolderId ? [targetFolderId] : undefined,
    };

    const media = {
      mimeType: 'application/pdf',
      body: stream,
    };

    const file = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, name, webViewLink',
    });

    return NextResponse.json({
      success: true,
      uploaded: true,
      status: 'uploaded',
      file_id: file.data?.id,
      file_name: file.data?.name,
      folder_id: targetFolderId,
    });
  } catch (error) {
    const safeError = formatSafeErrorResponse(error, correlationId);
    return NextResponse.json(safeError, { status: safeError.status });
  }
}
