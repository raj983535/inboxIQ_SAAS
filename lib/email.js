import nodemailer from 'nodemailer';

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
export async function sendSubscriptionActivatedEmail({ email, name, planName, amount, currency, nextRenewalDate }) {
  const fromEmail = process.env.EMAIL_FROM || process.env.EMAIL_USER || 'no-reply@inboxiq.online';
  const transporter = getEmailTransporter();
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

  if (!transporter) {
    console.log('[sendSubscriptionActivatedEmail] Simulated email dispatch to:', email);
    return { success: true, simulated: true };
  }

  return transporter.sendMail({
    from: fromEmail,
    to: email,
    subject: `InboxIQ Subscription Active — ${planName}`,
    html,
  });
}

/**
 * Sends a 30-day renewal confirmation email when recurring payment is captured.
 */
export async function sendRenewalConfirmationEmail({ email, name, planName, amount, currency, paymentId, nextRenewalDate }) {
  const fromEmail = process.env.EMAIL_FROM || process.env.EMAIL_USER || 'no-reply@inboxiq.online';
  const transporter = getEmailTransporter();
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

  if (!transporter) {
    console.log('[sendRenewalConfirmationEmail] Simulated renewal email dispatch to:', email);
    return { success: true, simulated: true };
  }

  return transporter.sendMail({
    from: fromEmail,
    to: email,
    subject: `InboxIQ Monthly Renewal Receipt — ${symbol}${amount}`,
    html,
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
export async function sendTrialActivatedEmail({ email, name, planName, trialEndsAt }) {
  const fromEmail = process.env.EMAIL_FROM || process.env.EMAIL_USER || 'no-reply@inboxiq.online';
  const transporter = getEmailTransporter();
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

  if (!transporter) {
    console.log('[sendTrialActivatedEmail] Simulated email dispatch to:', email);
    return { success: true, simulated: true };
  }

  return transporter.sendMail({
    from: fromEmail,
    to: email,
    subject: `Your InboxIQ 3-Day Free Trial is Active!`,
    html,
  });
}


function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
