import nodemailer from 'nodemailer';
import { google } from 'googleapis';
import { supabaseAdmin } from '@/lib/supabase/server';
import { decryptToken } from '@/lib/encryption';
import { getGoogleOAuth2Client } from '@/lib/google/oauth';

/**
 * Creates and returns a Nodemailer transporter instance using environment variables.
 * Returns null if SMTP credentials are not configured.
 */
export function getEmailTransporter() {
  const host = process.env.EMAIL_HOST;
  const port = parseInt(process.env.EMAIL_PORT || '587', 10);
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASSWORD;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });
}

/**
 * Unified email sender with Dual-Delivery mode:
 * 1. Primary delivery: Sends directly via user's connected Gmail OAuth token (Slot 1) if available and userId provided.
 * 2. Secondary fallback: Sends via standard SMTP transporter (Nodemailer) if configured in environment.
 * 3. Fallback: Gracefully logs simulated dispatch.
 */
export async function sendEmail({ userId, toEmail, subject, htmlBody, textBody, fromName = 'InboxIQ Intelligence' }) {
  const fromEmail = process.env.EMAIL_FROM || process.env.EMAIL_USER || 'no-reply@inboxiq.online';

  // 1. Dual-Delivery Mode: Try Gmail OAuth delivery if userId is provided
  if (userId) {
    try {
      const { data: conn } = await supabaseAdmin
        .from('gmail_connections')
        .select('account_email, encrypted_refresh_token, status')
        .eq('user_id', userId)
        .eq('connection_slot', 1)
        .eq('status', 'connected')
        .maybeSingle();

      if (conn?.encrypted_refresh_token) {
        const refreshToken = decryptToken(conn.encrypted_refresh_token);
        const oauth2Client = getGoogleOAuth2Client();
        oauth2Client.setCredentials({ refresh_token: refreshToken });

        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
        const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
        const senderEmail = conn.account_email || fromEmail;
        const messageParts = [
          `From: "${fromName}" <${senderEmail}>`,
          `To: <${toEmail}>`,
          `Subject: ${utf8Subject}`,
          `Content-Type: text/html; charset=utf-8`,
          `MIME-Version: 1.0`,
          ``,
          htmlBody,
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

        return {
          success: true,
          method: 'gmail_oauth',
          messageId: sendRes.data?.id,
        };
      }
    } catch (gmailErr) {
      console.warn(`[sendEmail] Gmail OAuth delivery failed for ${toEmail}, attempting SMTP fallback:`, gmailErr.message);
    }
  }

  // 2. Fallback: SMTP Transporter (if configured)
  const transporter = getEmailTransporter();
  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: toEmail,
        subject: subject,
        text: textBody,
        html: htmlBody,
      });
      return { success: true, method: 'smtp', messageId: info.messageId };
    } catch (smtpErr) {
      console.error(`[sendEmail] SMTP delivery failed for ${toEmail}:`, smtpErr.message);
      throw smtpErr;
    }
  }

  // 3. Fallback: Simulated logging
  console.log(`[sendEmail] Simulated email dispatch to ${toEmail} (no Gmail connection or SMTP credentials):`, subject);
  return { success: true, simulated: true };
}

/**
 * Sends a contact form notification email to the InboxIQ admin/support inbox.
 *
 * @param {Object} params
 * @param {string} params.name - Visitor full name
 * @param {string} params.email - Visitor email address
 * @param {string} [params.subject] - Optional inquiry subject
 * @param {string} params.message - Inquiry message content
 */
export async function sendContactEmail({ name, email, subject, message }) {
  const destinationEmail = process.env.EMAIL_TO || 'sahilrajdurgapur23@gmail.com';
  const fromEmail = process.env.EMAIL_FROM || process.env.EMAIL_USER || `no-reply@inboxiq.online`;

  const emailSubject = subject?.trim()
    ? `InboxIQ Contact Request — ${name} (${subject.trim()})`
    : `InboxIQ Contact Request — ${name}`;

  const timestamp = new Date().toUTCString();

  const textBody = `
InboxIQ New Contact Request
----------------------------------------
Name:      ${name}
Email:     ${email}
Subject:   ${subject || 'General Inquiry'}
Timestamp: ${timestamp}
----------------------------------------

Message:
${message}
`.trim();

  const htmlBody = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
  <div style="border-bottom: 2px solid #10b981; padding-bottom: 16px; margin-bottom: 20px;">
    <h2 style="color: #0f172a; margin: 0; font-size: 20px;">InboxIQ Contact Request</h2>
    <p style="color: #64748b; font-size: 13px; margin: 4px 0 0 0;">Received from inboxiq.online contact portal</p>
  </div>
  
  <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 14px;">
    <tr>
      <td style="padding: 8px 0; color: #64748b; width: 100px; font-weight: 600;">Name:</td>
      <td style="padding: 8px 0; color: #0f172a; font-weight: bold;">${escapeHtml(name)}</td>
    </tr>
    <tr>
      <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Email:</td>
      <td style="padding: 8px 0; color: #0f172a;"><a href="mailto:${escapeHtml(email)}" style="color: #059669; text-decoration: none;">${escapeHtml(email)}</a></td>
    </tr>
    ${
      subject
        ? `<tr>
      <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Subject:</td>
      <td style="padding: 8px 0; color: #0f172a;">${escapeHtml(subject)}</td>
    </tr>`
        : ''
    }
    <tr>
      <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Timestamp:</td>
      <td style="padding: 8px 0; color: #64748b; font-size: 13px;">${timestamp}</td>
    </tr>
  </table>

  <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
    <h3 style="color: #334155; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 10px 0;">Message Content:</h3>
    <p style="color: #1e293b; font-size: 14px; line-height: 1.6; margin: 0; white-space: pre-wrap;">${escapeHtml(message)}</p>
  </div>

  <div style="font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 16px;">
    <p style="margin: 0;">Hit "Reply" in your email client to respond directly to <strong>${escapeHtml(email)}</strong>.</p>
  </div>
</div>
`.trim();

  const transporter = getEmailTransporter();

  if (!transporter) {
    console.warn(
      '[sendContactEmail] SMTP credentials not set in environment. Email payload:',
      { to: destinationEmail, replyTo: email, subject: emailSubject }
    );
    return { success: true, simulated: true };
  }

  const info = await transporter.sendMail({
    from: fromEmail,
    to: destinationEmail,
    replyTo: email,
    subject: emailSubject,
    text: textBody,
    html: htmlBody,
  });

  return { success: true, messageId: info.messageId };
}

/**
 * Sends a subscription activation email to the user.
 */
export async function sendSubscriptionActivatedEmail({ userId, email, name, planName, amount, currency, nextRenewalDate }) {
  const symbol = currency === 'USD' ? '$' : '₹';
  const formattedDate = nextRenewalDate ? new Date(nextRenewalDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'in 30 days';

  const html = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
  <div style="border-bottom: 2px solid #10b981; padding-bottom: 16px; margin-bottom: 20px;">
    <h2 style="color: #0f172a; margin: 0; font-size: 22px;">InboxIQ Subscription Activated 🎉</h2>
    <p style="color: #64748b; font-size: 14px; margin: 4px 0 0 0;">Your recurring daily AI briefing pipeline is live</p>
  </div>
  <p style="color: #334155; font-size: 15px; line-height: 1.6;">Hello <strong>${escapeHtml(name || 'there')}</strong>,</p>
  <p style="color: #334155; font-size: 14px; line-height: 1.6;">Thank you for subscribing to <strong>InboxIQ (${escapeHtml(planName)})</strong>. Your account has been activated with automated morning intelligence summaries.</p>
  <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
    <h4 style="margin: 0 0 10px 0; font-size: 13px; color: #475569; text-transform: uppercase;">Subscription Details:</h4>
    <p style="margin: 4px 0; font-size: 14px; color: #1e293b;"><strong>Plan:</strong> ${escapeHtml(planName)}</p>
    <p style="margin: 4px 0; font-size: 14px; color: #1e293b;"><strong>Billing:</strong> ${symbol}${amount} / month (Auto-renewed every 30 days)</p>
    <p style="margin: 4px 0; font-size: 14px; color: #1e293b;"><strong>Next Renewal:</strong> ${formattedDate}</p>
  </div>
  <p style="color: #64748b; font-size: 13px;">You can view past briefings and adjust your schedule anytime in your <a href="https://inboxiq.online/dashboard" style="color: #10b981; font-weight: bold;">InboxIQ Dashboard</a>.</p>
</div>`.trim();

  return sendEmail({
    userId,
    toEmail: email,
    subject: `InboxIQ Subscription Active — ${planName}`,
    htmlBody: html,
    textBody: `Your InboxIQ subscription for ${planName} is now active. Next renewal: ${formattedDate}.`,
    fromName: 'InboxIQ Intelligence',
  });
}

/**
 * Sends a 30-day renewal confirmation email when recurring payment is captured.
 */
export async function sendRenewalConfirmationEmail({ userId, email, name, planName, amount, currency, paymentId, nextRenewalDate }) {
  const symbol = currency === 'USD' ? '$' : '₹';
  const formattedDate = nextRenewalDate ? new Date(nextRenewalDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'in 30 days';

  const html = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
  <div style="border-bottom: 2px solid #10b981; padding-bottom: 16px; margin-bottom: 20px;">
    <h2 style="color: #0f172a; margin: 0; font-size: 22px;">InboxIQ Subscription Renewed 🔄</h2>
    <p style="color: #64748b; font-size: 14px; margin: 4px 0 0 0;">Your monthly access has been successfully extended</p>
  </div>
  <p style="color: #334155; font-size: 15px; line-height: 1.6;">Hello <strong>${escapeHtml(name || 'there')}</strong>,</p>
  <p style="color: #334155; font-size: 14px; line-height: 1.6;">Your monthly subscription for <strong>${escapeHtml(planName)}</strong> has successfully renewed. Your daily email intelligence briefings will continue without interruption.</p>
  <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
    <h4 style="margin: 0 0 10px 0; font-size: 13px; color: #475569; text-transform: uppercase;">Renewal Receipt:</h4>
    <p style="margin: 4px 0; font-size: 14px; color: #1e293b;"><strong>Amount Paid:</strong> ${symbol}${amount}</p>
    <p style="margin: 4px 0; font-size: 14px; color: #1e293b;"><strong>Payment Reference:</strong> <code style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px;">${escapeHtml(paymentId || 'Automated AutoPay')}</code></p>
    <p style="margin: 4px 0; font-size: 14px; color: #1e293b;"><strong>Next Billing Date:</strong> ${formattedDate}</p>
  </div>
  <p style="color: #64748b; font-size: 13px;">Manage your subscription, invoices, or cancellation anytime in your <a href="https://inboxiq.online/billing" style="color: #10b981; font-weight: bold;">Billing Settings</a>.</p>
</div>`.trim();

  return sendEmail({
    userId,
    toEmail: email,
    subject: `InboxIQ Monthly Renewal Receipt — ${symbol}${amount}`,
    htmlBody: html,
    textBody: `Your monthly subscription for ${planName} has successfully renewed (${symbol}${amount}). Next renewal: ${formattedDate}.`,
    fromName: 'InboxIQ Intelligence',
  });
}

/**
 * Sends an alert email when a user cancels their auto-renewal mandate.
 */
export async function sendSubscriptionCancelledEmail({ email, name, planName, expiryDate }) {
  const fromEmail = process.env.EMAIL_FROM || process.env.EMAIL_USER || 'no-reply@inboxiq.online';
  const transporter = getEmailTransporter();
  const formattedDate = expiryDate ? new Date(expiryDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'at the end of your billing cycle';

  const html = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
  <div style="border-bottom: 2px solid #f59e0b; padding-bottom: 16px; margin-bottom: 20px;">
    <h2 style="color: #0f172a; margin: 0; font-size: 20px;">Auto-Renewal Cancelled ⚠️</h2>
    <p style="color: #64748b; font-size: 13px; margin: 4px 0 0 0;">Your auto-debit recurring mandate was turned off</p>
  </div>
  <p style="color: #334155; font-size: 14px; line-height: 1.6;">Hello <strong>${escapeHtml(name || 'there')}</strong>,</p>
  <p style="color: #334155; font-size: 14px; line-height: 1.6;">Your auto-renewal for <strong>${escapeHtml(planName)}</strong> has been turned off. You will continue to receive your daily AI briefings until <strong>${formattedDate}</strong>.</p>
  <div style="background: #fffbeb; border: 1px solid #fef3c7; border-radius: 8px; padding: 14px; margin: 20px 0;">
    <p style="margin: 0; font-size: 13px; color: #92400e; line-height: 1.5;">
      After <strong>${formattedDate}</strong>, automated intelligence extraction will pause. You can re-activate anytime to prevent any disruption to your workflow.
    </p>
  </div>
  <p style="margin-top: 20px;">
    <a href="https://inboxiq.online/billing" style="display: inline-block; background: #10b981; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; font-size: 14px;">Reactivate Subscription</a>
  </p>
</div>`.trim();

  if (!transporter) {
    console.log('[sendSubscriptionCancelledEmail] Simulated email dispatch to:', email);
    return { success: true, simulated: true };
  }

  return transporter.sendMail({
    from: fromEmail,
    to: email,
    subject: `InboxIQ Auto-Renewal Status Update — ${planName}`,
    html,
  });
}

/**
 * Sends an urgent expiry notification when a subscription expires and pipeline locks.
 */
export async function sendSubscriptionExpiredEmail({ email, name, planName }) {
  const fromEmail = process.env.EMAIL_FROM || process.env.EMAIL_USER || 'no-reply@inboxiq.online';
  const transporter = getEmailTransporter();

  const html = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
  <div style="border-bottom: 2px solid #ef4444; padding-bottom: 16px; margin-bottom: 20px;">
    <h2 style="color: #0f172a; margin: 0; font-size: 20px;">Subscription Expired — Briefings Paused 🔒</h2>
    <p style="color: #64748b; font-size: 13px; margin: 4px 0 0 0;">Action required to resume your daily AI email intelligence</p>
  </div>
  <p style="color: #334155; font-size: 14px; line-height: 1.6;">Hello <strong>${escapeHtml(name || 'there')}</strong>,</p>
  <p style="color: #334155; font-size: 14px; line-height: 1.6;">Your 30-day billing cycle for <strong>${escapeHtml(planName)}</strong> has expired, and your automated morning briefings are now locked.</p>
  <div style="background: #fef2f2; border: 1px solid #fee2e2; border-radius: 8px; padding: 14px; margin: 20px 0;">
    <p style="margin: 0; font-size: 13px; color: #991b1b; line-height: 1.5;">
      Your Gmail & Google Drive configurations are safely preserved. Renew today to resume automated intelligence delivery tomorrow morning.
    </p>
  </div>
  <p style="margin-top: 20px;">
    <a href="https://inboxiq.online/billing" style="display: inline-block; background: #10b981; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; font-size: 14px;">Renew Subscription &amp; Unlock Briefings</a>
  </p>
</div>`.trim();

  if (!transporter) {
    console.log('[sendSubscriptionExpiredEmail] Simulated email dispatch to:', email);
    return { success: true, simulated: true };
  }

  return transporter.sendMail({
    from: fromEmail,
    to: email,
    subject: `Action Required: Your InboxIQ Briefings are Paused`,
    html,
  });
}

/**
 * Sends a welcome notification when a user starts their 3-day free trial.
 */
export async function sendTrialActivatedEmail({ userId, email, name, planName, trialEndsAt }) {
  const formattedEnd = trialEndsAt ? new Date(trialEndsAt).toLocaleDateString(undefined, { dateStyle: 'medium' }) : '3 days';

  const html = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
  <div style="border-bottom: 2px solid #10b981; padding-bottom: 16px; margin-bottom: 20px;">
    <h2 style="color: #0f172a; margin: 0; font-size: 20px;">Welcome to Your 3-Day Free Trial 🎉</h2>
    <p style="color: #64748b; font-size: 13px; margin: 4px 0 0 0;">InboxIQ Automated Daily Email Intelligence</p>
  </div>
  <p style="color: #334155; font-size: 14px; line-height: 1.6;">Hello <strong>${escapeHtml(name || 'there')}</strong>,</p>
  <p style="color: #334155; font-size: 14px; line-height: 1.6;">Your 3-day free trial for <strong>${escapeHtml(planName || 'InboxIQ Pro')}</strong> is now live! Your automated AI email briefings are scheduled and will run every morning.</p>
  <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin: 20px 0;">
    <p style="margin: 0 0 8px 0; font-size: 13px; color: #334155;"><strong>Trial Status:</strong> Active (72 Hours)</p>
    <p style="margin: 0; font-size: 13px; color: #64748b;"><strong>Trial Expiry:</strong> ${escapeHtml(formattedEnd)}</p>
  </div>
  <p style="color: #334155; font-size: 14px; line-height: 1.6;">To ensure uninterrupted briefings after your trial ends, you can activate your recurring subscription at any time from your billing dashboard.</p>
  <p style="margin-top: 20px;">
    <a href="https://inboxiq.online/billing" style="display: inline-block; background: #10b981; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; font-size: 14px;">View Subscription &amp; Billing</a>
  </p>
</div>`.trim();

  return sendEmail({
    userId,
    toEmail: email,
    subject: `Your InboxIQ 3-Day Free Trial is Active!`,
    htmlBody: html,
    textBody: `Your InboxIQ 3-day free trial is active until ${formattedEnd}.`,
    fromName: 'InboxIQ Intelligence',
  });
}


/**
 * Sends a daily scheduled renewal reminder email to users whose 3-day trial has ended.
 * Triggered by the hourly cron dispatcher at their configured report_time.
 */
export async function sendTrialExpiredRenewalReminderEmail({ userId, email, name, planName, reportTime, timezone }) {
  const renewUrl = 'https://www.inboxiq.online/billing';

  const html = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
  <div style="border-bottom: 2px solid #f59e0b; padding-bottom: 16px; margin-bottom: 20px;">
    <h2 style="color: #0f172a; margin: 0; font-size: 22px;">Your 3-Day Free Trial Has Ended ⏳</h2>
    <p style="color: #64748b; font-size: 14px; margin: 4px 0 0 0;">Resume your daily AI email intelligence briefing</p>
  </div>
  <p style="color: #334155; font-size: 15px; line-height: 1.6;">Hello <strong>${escapeHtml(name || 'there')}</strong>,</p>
  <p style="color: #334155; font-size: 14px; line-height: 1.6;">
    It's <strong>${escapeHtml(reportTime || 'your scheduled briefing time')}</strong>, but your morning email briefing could not be delivered today because your <strong>3-day free trial</strong> has concluded.
  </p>
  <div style="background: #fffbeb; border: 1px solid #fef3c7; border-radius: 8px; padding: 16px; margin: 20px 0;">
    <h4 style="margin: 0 0 8px 0; font-size: 13px; color: #92400e; text-transform: uppercase; letter-spacing: 0.5px;">Account Status:</h4>
    <p style="margin: 4px 0; font-size: 14px; color: #78350f;"><strong>Status:</strong> Free Trial Ended</p>
    <p style="margin: 4px 0; font-size: 13px; color: #92400e; line-height: 1.5;">
      Your connected Gmail mailboxes and custom briefing preferences are safely preserved. Upgrade to a paid plan today to resume automated intelligence delivery tomorrow morning.
    </p>
  </div>
  <div style="text-align: center; margin: 28px 0;">
    <a href="${renewUrl}" style="display: inline-block; background: #10b981; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: bold; font-size: 15px; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);">
      Upgrade Plan &amp; Unlock Daily Briefings →
    </a>
  </div>
  <p style="color: #94a3b8; font-size: 12px; border-top: 1px solid #f1f5f9; padding-top: 16px; margin-top: 24px;">
    Need assistance or have questions? Visit <a href="https://www.inboxiq.online/contact" style="color: #10b981; text-decoration: none;">InboxIQ Support</a>.
  </p>
</div>`.trim();

  return sendEmail({
    userId,
    toEmail: email,
    subject: `InboxIQ: Your Free Trial Has Ended — Renew to Unlock Briefings`,
    htmlBody: html,
    textBody: `Your InboxIQ 3-day free trial has ended. Renew at ${renewUrl} to resume your daily briefings.`,
    fromName: 'InboxIQ Intelligence',
  });
}

/**
 * Sends a daily scheduled renewal reminder email to users whose paid subscription has ended.
 * Triggered by the hourly cron dispatcher at their configured report_time.
 */
export async function sendSubscriptionExpiredRenewalReminderEmail({ userId, email, name, planName, reportTime }) {
  const renewUrl = 'https://www.inboxiq.online/billing';

  const html = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
  <div style="border-bottom: 2px solid #ef4444; padding-bottom: 16px; margin-bottom: 20px;">
    <h2 style="color: #0f172a; margin: 0; font-size: 22px;">Subscription Expired — Briefings Paused 🔒</h2>
    <p style="color: #64748b; font-size: 14px; margin: 4px 0 0 0;">Action required to resume your daily AI email intelligence</p>
  </div>
  <p style="color: #334155; font-size: 15px; line-height: 1.6;">Hello <strong>${escapeHtml(name || 'there')}</strong>,</p>
  <p style="color: #334155; font-size: 14px; line-height: 1.6;">
    It's <strong>${escapeHtml(reportTime || 'your scheduled briefing time')}</strong>, but your morning intelligence summary is paused because your subscription has ended.
  </p>
  <div style="background: #fef2f2; border: 1px solid #fee2e2; border-radius: 8px; padding: 16px; margin: 20px 0;">
    <h4 style="margin: 0 0 8px 0; font-size: 13px; color: #991b1b; text-transform: uppercase; letter-spacing: 0.5px;">Current Status:</h4>
    <p style="margin: 4px 0; font-size: 14px; color: #7f1d1d;"><strong>Subscription:</strong> Ended / Inactive</p>
    <p style="margin: 4px 0; font-size: 13px; color: #991b1b; line-height: 1.5;">
      Your accounts, credentials, and settings remain securely configured. Click below to renew your subscription and resume automated daily briefings.
    </p>
  </div>
  <div style="text-align: center; margin: 28px 0;">
    <a href="${renewUrl}" style="display: inline-block; background: #10b981; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: bold; font-size: 15px; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);">
      Renew Subscription &amp; Unlock Briefings →
    </a>
  </div>
  <p style="color: #94a3b8; font-size: 12px; border-top: 1px solid #f1f5f9; padding-top: 16px; margin-top: 24px;">
    Need help? Reach out anytime at <a href="https://www.inboxiq.online/contact" style="color: #10b981; text-decoration: none;">InboxIQ Contact</a>.
  </p>
</div>`.trim();

  return sendEmail({
    userId,
    toEmail: email,
    subject: `Action Required: Renew InboxIQ to Resume Morning Briefings`,
    htmlBody: html,
    textBody: `Your InboxIQ subscription has ended. Renew at ${renewUrl} to resume your daily briefings.`,
    fromName: 'InboxIQ Intelligence',
  });
}

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/&lt;/g, '&lt;')
    .replace(/&gt;/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
