import { NextResponse } from 'next/server';
import { google } from 'googleapis';
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

    const { user_id, execution_id, connection_slot, window_start, window_end } = body;

    // 1. Strict Input Validation
    if (!user_id || typeof user_id !== 'string') {
      throw new AppError(ErrorCategories.VALIDATION_ERROR, 'Missing or invalid user_id.', 400);
    }
    const slot = Number(connection_slot);
    if (slot !== 1 && slot !== 2) {
      throw new AppError(ErrorCategories.VALIDATION_ERROR, 'connection_slot must be 1 or 2.', 400);
    }
    if (!window_start || !window_end) {
      throw new AppError(ErrorCategories.VALIDATION_ERROR, 'window_start and window_end are required.', 400);
    }

    const startTime = new Date(window_start);
    const endTime = new Date(window_end);
    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
      throw new AppError(ErrorCategories.VALIDATION_ERROR, 'Invalid ISO-8601 window timestamps.', 400);
    }

    // 2. Subscription Verification
    const { data: subData, error: subErr } = await supabaseAdmin
      .from('subscriptions')
      .select('status, current_period_end')
      .eq('user_id', user_id)
      .maybeSingle();

    if (subErr || !subData) {
      throw new AppError(ErrorCategories.AUTH_ERROR, 'User subscription not found.', 403);
    }

    const isSubActive =
      subData.status === 'active' ||
      (subData.status === 'trialing' && subData.current_period_end && new Date(subData.current_period_end) > new Date()) ||
      (subData.status === 'cancelled' && subData.current_period_end && new Date(subData.current_period_end) > new Date());

    if (!isSubActive) {
      throw new AppError(ErrorCategories.AUTH_ERROR, 'User subscription is inactive or expired.', 403);
    }

    // 3. Resolve Gmail Connection strictly matching user_id AND connection_slot
    const { data: connection, error: connErr } = await supabaseAdmin
      .from('gmail_connections')
      .select('id, account_email, encrypted_refresh_token, status')
      .eq('user_id', user_id)
      .eq('connection_slot', slot)
      .maybeSingle();

    if (connErr || !connection) {
      return NextResponse.json({
        success: true,
        connected: false,
        status: 'not_connected',
        slot,
        emails: [],
        count: 0,
      });
    }

    if (connection.status !== 'connected' || !connection.encrypted_refresh_token) {
      return NextResponse.json({
        success: true,
        connected: false,
        status: connection.status,
        slot,
        emails: [],
        count: 0,
      });
    }

    // 4. Server-Side Decryption & Google Client Initialization
    let refreshToken;
    try {
      refreshToken = decryptToken(connection.encrypted_refresh_token);
    } catch (err) {
      throw new AppError(ErrorCategories.ENCRYPTION_ERROR, 'Failed to decrypt token securely.', 500);
    }

    const oauth2Client = getGoogleOAuth2Client();
    oauth2Client.setCredentials({ refresh_token: refreshToken });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Gmail search timestamps (in seconds)
    const afterEpoch = Math.floor(startTime.getTime() / 1000);
    const beforeEpoch = Math.floor(endTime.getTime() / 1000);

    // Queries: Received (inbox, non-draft, non-sent) and Sent
    const qInbox = `-in:sent -in:drafts after:${afterEpoch} before:${beforeEpoch}`;
    const qSent = `in:sent after:${afterEpoch} before:${beforeEpoch}`;

    const [inboxRes, sentRes] = await Promise.all([
      gmail.users.messages.list({ userId: 'me', q: qInbox, maxResults: 50 }).catch(() => ({ data: { messages: [] } })),
      gmail.users.messages.list({ userId: 'me', q: qSent, maxResults: 50 }).catch(() => ({ data: { messages: [] } })),
    ]);

    const inboxMsgMeta = inboxRes.data?.messages || [];
    const sentMsgMeta = sentRes.data?.messages || [];

    const allMsgMeta = [
      ...inboxMsgMeta.map((m) => ({ ...m, direction: 'incoming' })),
      ...sentMsgMeta.map((m) => ({ ...m, direction: 'outgoing' })),
    ];

    // Deduplicate by message ID
    const uniqueIds = new Set();
    const deduplicatedMeta = [];
    for (const m of allMsgMeta) {
      if (!uniqueIds.has(m.id)) {
        uniqueIds.add(m.id);
        deduplicatedMeta.push(m);
      }
    }

    // Fetch message details in controlled batches of 10
    const fetchedEmails = [];
    const BATCH_SIZE = 10;
    for (let i = 0; i < deduplicatedMeta.length; i += BATCH_SIZE) {
      const chunk = deduplicatedMeta.slice(i, i + BATCH_SIZE);
      const details = await Promise.all(
        chunk.map(async (meta) => {
          try {
            const detail = await gmail.users.messages.get({
              userId: 'me',
              id: meta.id,
              format: 'metadata',
              metadataHeaders: ['From', 'To', 'Subject', 'Date'],
            });

            const headers = detail.data?.payload?.headers || [];
            const getHeader = (name) => headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || '';

            return {
              id: detail.data?.id,
              threadId: detail.data?.threadId,
              accountEmail: connection.account_email,
              slot,
              direction: meta.direction,
              from: getHeader('From'),
              to: getHeader('To'),
              subject: getHeader('Subject'),
              date: getHeader('Date'),
              snippet: detail.data?.snippet || '',
              labelIds: detail.data?.labelIds || [],
            };
          } catch (e) {
            return null;
          }
        })
      );
      fetchedEmails.push(...details.filter(Boolean));
    }

    return NextResponse.json({
      success: true,
      connected: true,
      status: 'connected',
      accountEmail: connection.account_email,
      slot,
      emails: fetchedEmails,
      count: fetchedEmails.length,
    });
  } catch (error) {
    const safeError = formatSafeErrorResponse(error, correlationId);
    return NextResponse.json(safeError, { status: safeError.status });
  }
}
