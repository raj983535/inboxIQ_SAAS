import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { verifyInternalAuth } from '@/lib/internal-auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { decryptToken } from '@/lib/encryption';
import { getGoogleOAuth2Client } from '@/lib/google/oauth';
import { getEmailTransporter } from '@/lib/email';
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

    const { user_id, execution_id, subject, html_content } = body;

    if (!user_id || typeof user_id !== 'string') {
      throw new AppError(ErrorCategories.VALIDATION_ERROR, 'Missing or invalid user_id.', 400);
    }
    if (!subject || !html_content) {
      throw new AppError(ErrorCategories.VALIDATION_ERROR, 'subject and html_content are required.', 400);
    }

    // 1. Authoritative User Lookup from Database (Recipient cannot be forged by n8n)
    const { data: user, error: userErr } = await supabaseAdmin
      .from('users')
      .select('id, email, name, status')
      .eq('id', user_id)
      .maybeSingle();

    if (userErr || !user) {
      throw new AppError(ErrorCategories.USER_NOT_FOUND, 'Verified user profile not found.', 404);
    }

    const recipientEmail = user.email;

    // 2. Subscription Check
    const { data: subData } = await supabaseAdmin
      .from('subscriptions')
      .select('status, current_period_end, trial_ends_at')
      .eq('user_id', user_id)
      .maybeSingle();

    const hasValidTrial =
      (subData?.status === 'trialing' || subData?.status === 'created') &&
      subData?.trial_ends_at &&
      new Date(subData.trial_ends_at) > new Date();

    const isSubActive =
      subData?.status === 'active' ||
      hasValidTrial ||
      (subData?.status === 'cancelled' && subData.current_period_end && new Date(subData.current_period_end) > new Date());

    if (!isSubActive) {
      throw new AppError(ErrorCategories.AUTH_ERROR, 'User subscription is inactive or expired.', 403);
    }

    // 3. Try to deliver via primary connected Gmail account (Slot 1)
    const { data: primaryConn } = await supabaseAdmin
      .from('gmail_connections')
      .select('account_email, encrypted_refresh_token, status')
      .eq('user_id', user_id)
      .eq('connection_slot', 1)
      .eq('status', 'connected')
      .maybeSingle();

    let deliveredMethod = null;
    let messageId = null;

    if (primaryConn && primaryConn.encrypted_refresh_token) {
      try {
        const refreshToken = decryptToken(primaryConn.encrypted_refresh_token);
        const oauth2Client = getGoogleOAuth2Client();
        oauth2Client.setCredentials({ refresh_token: refreshToken });

        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

        // Construct RFC 2822 email message
        const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
        const messageParts = [
          `From: InboxIQ Intelligence <${primaryConn.account_email}>`,
          `To: <${recipientEmail}>`,
          `Subject: ${utf8Subject}`,
          `Content-Type: text/html; charset=utf-8`,
          `MIME-Version: 1.0`,
          ``,
          html_content,
        ];
        const message = messageParts.join('\r\n');
        const encodedMessage = Buffer.from(message)
          .toString('base64')
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '');

        const sendRes = await gmail.users.messages.send({
          userId: 'me',
          requestBody: { raw: encodedMessage },
        });

        deliveredMethod = 'gmail_oauth_slot1';
        messageId = sendRes.data?.id;
      } catch (gmailErr) {
        console.warn('Gmail OAuth delivery failed, trying SMTP fallback:', gmailErr.message);
      }
    }

    // 4. Fallback: SMTP Transporter (if configured)
    if (!deliveredMethod) {
      const transporter = getEmailTransporter();
      if (transporter) {
        const fromEmail = process.env.EMAIL_FROM || process.env.EMAIL_USER || 'no-reply@inboxiq.online';
        const info = await transporter.sendMail({
          from: `"InboxIQ Intelligence" <${fromEmail}>`,
          to: recipientEmail,
          subject: subject,
          html: html_content,
        });
        deliveredMethod = 'smtp';
        messageId = info.messageId;
      }
    }

    if (!deliveredMethod) {
      throw new AppError(
        ErrorCategories.EMAIL_DELIVERY_FAILED,
        'No valid delivery channel available (Gmail connection disconnected and SMTP unconfigured).',
        500
      );
    }

    return NextResponse.json({
      success: true,
      delivered: true,
      recipient: recipientEmail,
      delivery_method: deliveredMethod,
      message_id: messageId,
    });
  } catch (error) {
    const safeError = formatSafeErrorResponse(error, correlationId);
    return NextResponse.json(safeError, { status: safeError.status });
  }
}
