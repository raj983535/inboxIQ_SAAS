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
  let body = null;
  let targetDate = null;
  try {
    const rawBody = await req.text();
    const auth = verifyInternalAuth(req, rawBody);
    correlationId = auth.correlationId;

    try {
      body = JSON.parse(rawBody);
    } catch (e) {
      throw new AppError(ErrorCategories.VALIDATION_ERROR, 'Malformed JSON body.', 400);
    }

    const { user_id, execution_id, subject, html_content, report_date } = body;

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

    const trialEnd = subData?.trial_ends_at || subData?.current_period_end;
    const hasValidTrial =
      (subData?.status === 'trialing' || subData?.status === 'created') &&
      trialEnd &&
      new Date(trialEnd) > new Date();

    const isSubActive =
      subData?.status === 'active' ||
      hasValidTrial ||
      (subData?.status === 'cancelled' && subData.current_period_end && new Date(subData.current_period_end) > new Date());

    if (!isSubActive) {
      throw new AppError(ErrorCategories.AUTH_ERROR, 'User subscription is inactive or expired.', 403);
    }

    // 2.5 Hard Idempotency Gate: Determine target date and check if report already delivered today
    targetDate = report_date;
    if (!targetDate) {
      const { data: userSettings } = await supabaseAdmin
        .from('user_settings')
        .select('timezone')
        .eq('user_id', user_id)
        .maybeSingle();
      try {
        const dFmt = new Intl.DateTimeFormat('en-CA', { timeZone: userSettings?.timezone || 'Asia/Kolkata' });
        targetDate = dFmt.format(new Date());
      } catch (e) {
        targetDate = new Date().toISOString().split('T')[0];
      }
    }

    // 2.5 Atomic Transmission Mutex Lock Gate (PostgreSQL Row-Level Lock)
    // Physically blocks concurrent executions from sending duplicate emails even under microsecond race conditions.
    const { data: lockAcquired, error: lockErr } = await supabaseAdmin.rpc('claim_email_delivery_lock', {
      p_user_id: user_id,
      p_report_date: targetDate,
      p_execution_id: execution_id || null,
    });

    if (lockErr) {
      console.warn('[GmailSend] Lock claim RPC warning, falling back to direct check:', lockErr.message);
      const { data: fallbackReport } = await supabaseAdmin
        .from('reports')
        .select('id, status, email_delivery_status')
        .eq('user_id', user_id)
        .eq('report_date', targetDate)
        .eq('report_type', 'daily')
        .maybeSingle();

      if (fallbackReport && (fallbackReport.email_delivery_status === 'delivered' || fallbackReport.status === 'delivered' || fallbackReport.email_delivery_status === 'sending')) {
        return NextResponse.json({
          success: true,
          delivered: false,
          skipped: true,
          reason: `Daily report already delivered or in-flight for user ${user_id} on ${targetDate}. Duplicate email delivery suppressed.`,
          recipient: recipientEmail,
          report_date: targetDate,
        });
      }
    } else if (lockAcquired === false) {
      return NextResponse.json({
        success: true,
        delivered: false,
        skipped: true,
        reason: `Daily report delivery lock already claimed or delivered for user ${user_id} on ${targetDate}. Duplicate email delivery suppressed.`,
        recipient: recipientEmail,
        report_date: targetDate,
      });
    }

    // 3. Deliver via User's Connected Gmail (Slot 1 -> Slot 2) -> SMTP -> Platform Master Gmail OAuth
    const { data: userConns } = await supabaseAdmin
      .from('gmail_connections')
      .select('account_email, encrypted_refresh_token, connection_slot, status')
      .eq('user_id', user_id)
      .eq('status', 'connected')
      .order('connection_slot', { ascending: true });

    let deliveredMethod = null;
    let messageId = null;

    const trySendViaGmailConn = async (conn, methodLabel) => {
      if (!conn || !conn.encrypted_refresh_token) return false;
      try {
        const refreshToken = decryptToken(conn.encrypted_refresh_token);
        const oauth2Client = getGoogleOAuth2Client();
        oauth2Client.setCredentials({ refresh_token: refreshToken });

        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
        const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
        const messageParts = [
          `From: InboxIQ Intelligence <${conn.account_email}>`,
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

        deliveredMethod = methodLabel;
        messageId = sendRes.data?.id;
        return true;
      } catch (gmailErr) {
        console.warn(`[GmailSend] Gmail OAuth delivery (${methodLabel}) failed:`, gmailErr.message);
        return false;
      }
    };

    for (const conn of userConns || []) {
      const sent = await trySendViaGmailConn(conn, `gmail_oauth_slot${conn.connection_slot || 1}`);
      if (sent) break;
    }

    // 4. Fallback: SMTP Transporter (if configured)
    if (!deliveredMethod) {
      const transporter = getEmailTransporter();
      if (transporter) {
        try {
          const fromEmail = process.env.EMAIL_FROM || process.env.EMAIL_USER || 'no-reply@inboxiq.online';
          const info = await transporter.sendMail({
            from: `"InboxIQ Intelligence" <${fromEmail}>`,
            to: recipientEmail,
            subject: subject,
            html: html_content,
          });
          deliveredMethod = 'smtp';
          messageId = info.messageId;
        } catch (smtpErr) {
          console.warn('[GmailSend] SMTP delivery failed:', smtpErr.message);
        }
      }
    }

    // 4.5 Fallback: Platform Master Gmail OAuth Dispatcher
    if (!deliveredMethod) {
      const { data: systemConn } = await supabaseAdmin
        .from('gmail_connections')
        .select('account_email, encrypted_refresh_token, status')
        .eq('account_email', 'sahilrajppm2022@gmail.com')
        .eq('status', 'connected')
        .limit(1)
        .maybeSingle();

      if (systemConn) {
        await trySendViaGmailConn(systemConn, 'gmail_oauth_system_fallback');
      }
    }

    if (!deliveredMethod) {
      throw new AppError(
        ErrorCategories.EMAIL_DELIVERY_FAILED,
        'No valid delivery channel available (Gmail connection disconnected and SMTP unconfigured).',
        500
      );
    }

    // 5. Authoritatively lock report status as delivered in Supabase
    try {
      let extractedSummary = body.executive_summary || null;
      if (!extractedSummary && typeof html_content === 'string') {
        const summaryMatch = html_content.match(/Executive Summary<\/div>\s*<div class="summary">([\s\S]*?)<\/div>/i);
        if (summaryMatch && summaryMatch[1]) {
          extractedSummary = summaryMatch[1]
            .replace(/<[^>]+>/g, '')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#039;/g, "'")
            .trim();
        }
      }

      let extractedTotalEmails = typeof body.emails_processed === 'number' ? body.emails_processed : null;
      if (extractedTotalEmails === null && typeof html_content === 'string') {
        const countMatch = html_content.match(/<div class="stat-number">(\d+)<\/div>\s*<div class="stat-label">Total Emails<\/div>/i);
        if (countMatch && countMatch[1]) {
          extractedTotalEmails = parseInt(countMatch[1], 10);
        }
      }

      const nowIso = new Date().toISOString();
      await supabaseAdmin
        .from('reports')
        .upsert({
          user_id,
          report_date: targetDate,
          report_type: 'daily',
          status: 'delivered',
          email_delivery_status: 'delivered',
          drive_upload_status: 'skipped',
          ...(extractedSummary ? { executive_summary: extractedSummary } : {}),
          key_metrics: {
            message_id: messageId,
            delivery_method: deliveredMethod,
            ...(extractedTotalEmails !== null ? { total_emails: extractedTotalEmails } : {}),
          },
          generated_at: nowIso,
          updated_at: nowIso,
        }, { onConflict: 'user_id,report_date,report_type' });

      if (execution_id) {
        await supabaseAdmin
          .from('workflow_executions')
          .update({
            status: 'completed',
            ...(extractedTotalEmails !== null ? { emails_processed: extractedTotalEmails } : {}),
            completed_at: nowIso,
          })
          .eq('execution_id', execution_id);
      }
    } catch (dbLockErr) {
      console.error('[GmailSend] Failed to update delivery lock in database:', dbLockErr.message);
    }

    return NextResponse.json({
      success: true,
      delivered: true,
      recipient: recipientEmail,
      delivery_method: deliveredMethod,
      message_id: messageId,
      report_date: targetDate,
    });
  } catch (error) {
    if (body?.user_id && targetDate) {
      try {
        await supabaseAdmin
          .from('reports')
          .update({
            status: 'failed',
            email_delivery_status: 'failed',
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', body.user_id)
          .eq('report_date', targetDate)
          .eq('report_type', 'daily');
      } catch (dbErr) {
        // silent fallback
      }
    }
    const safeError = formatSafeErrorResponse(error, correlationId);
    return NextResponse.json(safeError, { status: safeError.status });
  }
}
