import { google } from 'googleapis';
import { supabaseAdmin } from '@/lib/supabase/server';
import { decryptToken } from '@/lib/encryption';
import { getGoogleOAuth2Client } from '@/lib/google/oauth';
import { getEmailTransporter } from '@/lib/email';

/**
 * Escapes HTML special characters safely.
 */
function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Fetches emails from a specific Gmail connection slot for the given 24-hour window.
 */
async function fetchSlotEmails(userId, slot, startTime, endTime) {
  const { data: connection, error: connErr } = await supabaseAdmin
    .from('gmail_connections')
    .select('id, account_email, encrypted_refresh_token, status')
    .eq('user_id', userId)
    .eq('connection_slot', slot)
    .maybeSingle();

  if (connErr || !connection || connection.status !== 'connected' || !connection.encrypted_refresh_token) {
    return [];
  }

  let refreshToken;
  try {
    refreshToken = decryptToken(connection.encrypted_refresh_token);
  } catch (err) {
    console.error(`[NativeEngine] Failed to decrypt token for user ${userId} slot ${slot}:`, err.message);
    return [];
  }

  const oauth2Client = getGoogleOAuth2Client();
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  const afterEpoch = Math.floor(startTime.getTime() / 1000);
  const beforeEpoch = Math.floor(endTime.getTime() / 1000);

  const qInbox = `-in:sent -in:drafts after:${afterEpoch} before:${beforeEpoch}`;
  const qSent = `in:sent after:${afterEpoch} before:${beforeEpoch}`;

  let authRevoked = false;

  const [inboxRes, sentRes] = await Promise.all([
    gmail.users.messages.list({ userId: 'me', q: qInbox, maxResults: 100 }).catch((e) => {
      if (e.message?.includes('invalid_grant') || e.message?.includes('Token has been expired or revoked')) {
        authRevoked = true;
      }
      console.error(`[NativeEngine] Slot ${slot} inbox list error:`, e.message);
      return { data: { messages: [] } };
    }),
    gmail.users.messages.list({ userId: 'me', q: qSent, maxResults: 100 }).catch((e) => {
      if (e.message?.includes('invalid_grant') || e.message?.includes('Token has been expired or revoked')) {
        authRevoked = true;
      }
      console.error(`[NativeEngine] Slot ${slot} sent list error:`, e.message);
      return { data: { messages: [] } };
    }),
  ]);

  if (authRevoked) {
    await supabaseAdmin
      .from('gmail_connections')
      .update({
        status: 'error',
        last_error: 'Google authorization has expired or was revoked. Please reconnect in Settings.',
        updated_at: new Date().toISOString(),
      })
      .eq('id', connection.id);
    return [];
  }

  const inboxMsgMeta = inboxRes.data?.messages || [];
  const sentMsgMeta = sentRes.data?.messages || [];

  const allMsgMeta = [
    ...inboxMsgMeta.map((m) => ({ ...m, direction: 'incoming' })),
    ...sentMsgMeta.map((m) => ({ ...m, direction: 'outgoing' })),
  ];

  const uniqueIds = new Set();
  const deduplicatedMeta = [];
  for (const m of allMsgMeta) {
    if (m.id && !uniqueIds.has(m.id)) {
      uniqueIds.add(m.id);
      deduplicatedMeta.push(m);
    }
  }

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
          const getHeader = (name) =>
            headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || '';

          return {
            id: detail.data?.id,
            threadId: detail.data?.threadId,
            accountEmail: connection.account_email,
            slot,
            direction: meta.direction,
            from: getHeader('From'),
            to: getHeader('To'),
            subject: getHeader('Subject') || '(No Subject)',
            date: getHeader('Date') || '',
            snippet: (detail.data?.snippet || '').substring(0, 800),
            labelIds: detail.data?.labelIds || [],
          };
        } catch {
          return null;
        }
      })
    );
    fetchedEmails.push(...details.filter(Boolean));
  }

  return fetchedEmails;
}

/**
 * Analyzes the 24-hour email dataset using Gemini 2.0 Flash if configured,
 * with a deterministic multi-signal classification engine fallback.
 */
async function analyzeEmailsIntelligence({ emails, profession, userName, reportDate, windowStart, windowEnd }) {
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;

  if (geminiKey && emails.length > 0) {
    try {
      const prompt = `You are an Email Intelligence Assistant. Analyze the following ${emails.length} emails for ${userName} (Profession: ${profession}) from ${windowStart} to ${windowEnd} (Report Date: ${reportDate}).
Return ONLY valid JSON matching this schema:
{
  "reportDate": "${reportDate}",
  "totalEmails": ${emails.length},
  "overallSummary": "Comprehensive 2-4 sentence executive summary of the day's emails and key priorities.",
  "importantEmails": [{ "sender": "...", "subject": "...", "dateTime": "...", "reason": "...", "action": "..." }],
  "urgentEmails": [{ "sender": "...", "subject": "...", "dateTime": "...", "reason": "...", "action": "..." }],
  "repliedEmails": [{ "sender": "...", "subject": "...", "dateTime": "...", "reason": "...", "action": "..." }],
  "otherEmails": [{ "sender": "...", "subject": "...", "dateTime": "...", "reason": "..." }],
  "actionItems": ["..."]
}
Emails dataset:
${JSON.stringify(emails.slice(0, 60))}`;

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
          }),
          signal: AbortSignal.timeout(20000),
        }
      );

      if (res.ok) {
        const data = await res.json();
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawText) {
          const parsed = JSON.parse(rawText.replace(/^```json\s*/i, '').replace(/```$/, '').trim());
          if (parsed && typeof parsed === 'object') {
            return {
              reportDate,
              totalEmails: emails.length,
              overallSummary: parsed.overallSummary || `Analyzed ${emails.length} emails across your connected inbox for ${reportDate}.`,
              importantEmails: Array.isArray(parsed.importantEmails) ? parsed.importantEmails : [],
              urgentEmails: Array.isArray(parsed.urgentEmails) ? parsed.urgentEmails : [],
              repliedEmails: Array.isArray(parsed.repliedEmails) ? parsed.repliedEmails : [],
              otherEmails: Array.isArray(parsed.otherEmails) ? parsed.otherEmails : [],
              actionItems: Array.isArray(parsed.actionItems) ? parsed.actionItems : [],
            };
          }
        }
      }
    } catch (aiErr) {
      console.warn('[NativeEngine] Gemini API fallback to deterministic classifier:', aiErr.message);
    }
  }

  // Deterministic Multi-Signal Email Classifier (Zero external failure points)
  const totalEmails = emails.length;
  if (totalEmails === 0) {
    return {
      reportDate,
      totalEmails: 0,
      overallSummary: 'No new emails were received or sent during this 24-hour reporting window. Your inbox is completely clear.',
      importantEmails: [],
      urgentEmails: [],
      repliedEmails: [],
      otherEmails: [],
      actionItems: ['No pending email actions required today.'],
    };
  }

  const outgoingThreadIds = new Set(
    emails.filter((e) => e.direction === 'outgoing' || (e.labelIds || []).includes('SENT')).map((e) => e.threadId).filter(Boolean)
  );

  const urgentRegex = /\b(urgent|asap|deadline|due\s+today|due\s+date|action\s+required|immediate|important\s+notice|exam|quiz|assignment|submission|interview|offer\s+letter|invoice|payment\s+due|payment\s+failed|security\s+alert|verification|otp|suspended|expired|final\s+notice|warning)\b/i;
  const promoRegex = /\b(unsubscribe|newsletter|promotion|sale|discount|% off|deal|offer\s+ends|digest|no-reply|noreply|notifications?@|updates?@|marketing)\b/i;
  const academicOrWorkRegex = /\b(professor|dr\.|faculty|department|university|college|campus|class|course|lecture|grade|project|report|meeting|schedule|client|contract|proposal|review|approval|internship|placement|scholarship)\b/i;

  const urgentEmails = [];
  const importantEmails = [];
  const repliedEmails = [];
  const otherEmails = [];
  const actionItems = [];

  for (const email of emails) {
    const labels = email.labelIds || [];
    const combinedText = `${email.subject} ${email.snippet} ${email.from}`;
    const isUnread = labels.includes('UNREAD');
    const isImportantLabel = labels.includes('IMPORTANT') || labels.includes('STARRED');
    const isPromotion = labels.includes('CATEGORY_PROMOTIONS') || labels.includes('CATEGORY_SOCIAL') || labels.includes('CATEGORY_FORUMS');
    const cleanSnippet = (email.snippet || '').trim() || 'Email received in your connected inbox.';

    // 1. Outgoing or already-replied threads
    if (email.direction === 'outgoing' || labels.includes('SENT')) {
      repliedEmails.push({
        sender: `To: ${email.to || 'Recipient'}`,
        subject: email.subject,
        dateTime: email.date,
        reason: cleanSnippet,
        action: 'Sent / Replied from your account',
      });
      continue;
    }

    if (email.threadId && outgoingThreadIds.has(email.threadId)) {
      repliedEmails.push({
        sender: email.from,
        subject: email.subject,
        dateTime: email.date,
        reason: cleanSnippet,
        action: 'Already replied to in this thread',
      });
      continue;
    }

    // 2. Urgent classification
    if (urgentRegex.test(combinedText) || (labels.includes('STARRED') && isUnread)) {
      const actionText = isUnread
        ? 'Unread priority message — review and take action promptly'
        : 'Review time-sensitive details and confirm completion';
      urgentEmails.push({
        sender: email.from,
        subject: email.subject,
        dateTime: email.date,
        reason: cleanSnippet,
        action: actionText,
      });
      if (actionItems.length < 6) {
        const shortSender = (email.from || '').replace(/<[^>]+>/g, '').trim() || email.from;
        actionItems.push(`Review urgent email from ${shortSender}: "${email.subject}"`);
      }
      continue;
    }

    // 3. Important classification
    if (
      (isImportantLabel && !isPromotion) ||
      academicOrWorkRegex.test(combinedText) ||
      (!isPromotion && !promoRegex.test(combinedText) && labels.includes('CATEGORY_PERSONAL'))
    ) {
      const actionText = isUnread
        ? 'Unread — review and respond if needed'
        : 'Opened — keep for reference or follow up';
      importantEmails.push({
        sender: email.from,
        subject: email.subject,
        dateTime: email.date,
        reason: cleanSnippet,
        action: actionText,
      });
      if (isUnread && actionItems.length < 6) {
        const shortSender = (email.from || '').replace(/<[^>]+>/g, '').trim() || email.from;
        actionItems.push(`Check unread message from ${shortSender}: "${email.subject}"`);
      }
      continue;
    }

    // 4. General / Low Priority
    otherEmails.push({
      sender: email.from,
      subject: email.subject,
      dateTime: email.date,
      reason: cleanSnippet,
    });
  }

  if (actionItems.length === 0) {
    if (importantEmails.length > 0) {
      actionItems.push(`Review ${importantEmails.length} important email(s) highlighted in today's briefing.`);
    } else {
      actionItems.push('No high-priority action items pending from the last 24 hours.');
    }
  }

  const unreadCount = emails.filter((e) => (e.labelIds || []).includes('UNREAD')).length;
  const overallSummary = `During the last 24 hours (${reportDate}), InboxIQ analyzed ${totalEmails} email(s) across your connected inbox (${unreadCount} unread). We identified ${urgentEmails.length} urgent email(s) requiring immediate attention, ${importantEmails.length} important communication(s), ${repliedEmails.length} handled/sent message(s), and ${otherEmails.length} general/informational update(s).`;

  return {
    reportDate,
    totalEmails,
    overallSummary,
    importantEmails,
    urgentEmails,
    repliedEmails,
    otherEmails,
    actionItems,
  };
}

/**
 * Builds the exact responsive Profession HTML Report matching Node 13 of the production n8n workflow.
 */
function buildProfessionHtmlReport({ report, profession, userName, userTimezone, reportDate }) {
  const safeArray = (val) => (Array.isArray(val) ? val : []);

  const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) {
      return escapeHtml(date);
    }
    try {
      return d.toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: userTimezone || 'Asia/Kolkata',
      });
    } catch {
      return escapeHtml(String(date));
    }
  };

  const totalEmails = typeof report.totalEmails === 'number' ? report.totalEmails : 0;
  const importantEmails = safeArray(report.importantEmails);
  const urgentEmails = safeArray(report.urgentEmails);
  const repliedEmails = safeArray(report.repliedEmails);
  const otherEmails = safeArray(report.otherEmails);
  const actionItems = safeArray(report.actionItems);
  const overallSummary =
    report.overallSummary ||
    (totalEmails === 0
      ? 'No new emails received during this 24-hour reporting window.'
      : 'Email intelligence report synthesized by InboxIQ.');

  let badgeTitle = 'Faculty Intelligence';
  let headerGradient = 'linear-gradient(135deg, #111827 0%, #1f2937 100%)';
  if (profession === 'student') {
    badgeTitle = 'Student Academic Pulse';
    headerGradient = 'linear-gradient(135deg, #064e3b 0%, #047857 100%)';
  } else if (profession === 'others') {
    badgeTitle = 'Executive Intelligence';
    headerGradient = 'linear-gradient(135deg, #18181b 0%, #27272a 100%)';
  }

  function createEmailCards(emails, type) {
    if (emails.length === 0) {
      return '<div class="empty">None</div>';
    }

    return emails
      .map((email) => {
        const sender = escapeHtml(email.sender || 'Unknown sender');
        const subject = escapeHtml(email.subject || 'No subject');
        const dateTime = formatDate(email.dateTime);
        const reason = escapeHtml(
          email.reason || email.summary || email.context || 'No additional information available.'
        );
        const action = escapeHtml(email.action || email.requiredAction || email.status || '');

        return `
      <div class="email-card ${type}">
        <div class="email-header">
          <div class="email-main-info">
            <div class="sender">${sender}</div>
            <div class="subject">${subject}</div>
          </div>
          <div class="datetime">${dateTime}</div>
        </div>
        <div class="email-content">
          <div class="label">Why it matters</div>
          <div class="text">${reason}</div>
          ${action ? `<div class="label">Status / Required Action</div><div class="text">${action}</div>` : ''}
        </div>
      </div>
    `;
      })
      .join('');
  }

  function createActionItems(items) {
    if (items.length === 0) {
      return '<div class="empty">None</div>';
    }
    return `
    <ul class="action-list">
      ${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
    </ul>
  `;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>Daily Email Intelligence Report - ${escapeHtml(reportDate)}</title>
<style>
* { box-sizing: border-box; }
html { width: 100%; margin: 0; padding: 0; }
body { width: 100%; min-width: 100%; margin: 0; padding: 0; background: #f4f6f8; font-family: Arial, Helvetica, sans-serif; color: #1f2937; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
img { max-width: 100%; height: auto; }
table { max-width: 100%; }
h1, h2, h3, p, div, span { overflow-wrap: anywhere; word-wrap: break-word; }
.container { width: calc(100% - 32px); max-width: 900px; margin: 32px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 8px 30px rgba(15, 23, 42, 0.08); }
.header { padding: 40px; background: ${headerGradient}; color: #ffffff; }
.badge { display: inline-block; padding: 4px 12px; background: rgba(255,255,255,0.2); border-radius: 9999px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; }
.header-title { margin: 0; font-size: 30px; line-height: 1.25; font-weight: 700; letter-spacing: -0.5px; }
.header-subtitle { margin-top: 10px; font-size: 14px; line-height: 1.5; color: #d1d5db; }
.content { width: 100%; padding: 36px 40px; }
.section { width: 100%; margin-bottom: 36px; }
.section:last-child { margin-bottom: 0; }
.section-title { margin: 0 0 16px 0; font-size: 20px; line-height: 1.35; font-weight: 700; color: #111827; }
.summary { width: 100%; background: #f8fafc; border: 1px solid #e5e7eb; border-left: 4px solid #111827; padding: 20px; border-radius: 10px; line-height: 1.7; font-size: 14px; color: #374151; }
.stats { width: 100%; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; }
.stat { min-width: 0; width: 100%; background: #f8fafc; border-radius: 12px; padding: 20px; border: 1px solid #e5e7eb; }
.stat-number { font-size: 28px; line-height: 1.2; font-weight: 700; color: #111827; }
.stat-label { margin-top: 7px; font-size: 13px; line-height: 1.4; color: #6b7280; }
.email-card { width: 100%; border: 1px solid #e5e7eb; border-radius: 12px; margin-bottom: 14px; overflow: hidden; background: #ffffff; }
.email-card:last-child { margin-bottom: 0; }
.email-card.urgent { border-left: 5px solid #dc2626; }
.email-card.important { border-left: 5px solid #d97706; }
.email-card.replied { border-left: 5px solid #16a34a; }
.email-card.other { border-left: 5px solid #6b7280; }
.email-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; width: 100%; padding: 17px 18px; background: #f9fafb; }
.email-main-info { min-width: 0; flex: 1 1 auto; }
.sender { font-weight: 700; font-size: 14px; line-height: 1.45; color: #111827; }
.subject { margin-top: 5px; font-size: 15px; line-height: 1.5; color: #374151; }
.datetime { flex: 0 0 auto; max-width: 230px; font-size: 12px; line-height: 1.5; color: #6b7280; text-align: right; }
.email-content { width: 100%; padding: 18px; }
.label { margin-top: 8px; margin-bottom: 6px; font-size: 11px; line-height: 1.4; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: #6b7280; }
.text { width: 100%; font-size: 14px; line-height: 1.7; color: #374151; }
.empty { width: 100%; padding: 17px 18px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; color: #6b7280; font-size: 14px; line-height: 1.5; }
.action-list { margin: 0; padding-left: 22px; }
.action-list li { margin-bottom: 10px; line-height: 1.6; font-size: 14px; color: #374151; }
.action-list li:last-child { margin-bottom: 0; }
.footer { padding: 22px 40px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px; line-height: 1.5; text-align: center; }
@media screen and (max-width: 760px) {
  .container { width: calc(100% - 24px); margin: 20px auto; border-radius: 14px; }
  .header { padding: 30px; }
  .content { padding: 30px; }
  .footer { padding: 20px 30px; }
  .header-title { font-size: 26px; }
  .stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .email-header { gap: 12px; }
  .datetime { max-width: 180px; }
}
@media screen and (max-width: 600px) {
  body { background: #ffffff; }
  .container { width: 100%; max-width: 100%; margin: 0; border-radius: 0; box-shadow: none; }
  .header { padding: 26px 20px; }
  .content { padding: 26px 20px; }
  .footer { padding: 20px; }
  .header-title { font-size: 24px; line-height: 1.3; }
  .header-subtitle { font-size: 13px; }
  .section { margin-bottom: 30px; }
  .section-title { font-size: 19px; }
  .summary { padding: 17px; font-size: 14px; }
  .stats { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
  .stat { padding: 16px; }
  .stat-number { font-size: 24px; }
  .stat-label { font-size: 12px; }
  .email-header { display: block; padding: 16px; }
  .datetime { max-width: 100%; margin-top: 8px; text-align: left; }
  .email-content { padding: 16px; }
  .sender { font-size: 14px; }
  .subject { font-size: 14px; }
  .text { font-size: 14px; }
}
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <div class="badge">${badgeTitle}</div>
    <h1 class="header-title">Daily Email Intelligence Report</h1>
    <div class="header-subtitle">Prepared for ${escapeHtml(userName)} | Report Date: ${escapeHtml(reportDate)}</div>
  </div>
  <div class="content">
    <div class="section">
      <div class="section-title">Executive Summary</div>
      <div class="summary">${escapeHtml(overallSummary)}</div>
    </div>
    <div class="section">
      <div class="section-title">Email Overview</div>
      <div class="stats">
        <div class="stat">
          <div class="stat-number">${totalEmails}</div>
          <div class="stat-label">Total Emails</div>
        </div>
        <div class="stat">
          <div class="stat-number">${importantEmails.length}</div>
          <div class="stat-label">Important</div>
        </div>
        <div class="stat">
          <div class="stat-number">${urgentEmails.length}</div>
          <div class="stat-label">Urgent</div>
        </div>
        <div class="stat">
          <div class="stat-number">${repliedEmails.length}</div>
          <div class="stat-label">Replied</div>
        </div>
      </div>
    </div>
    <div class="section">
      <div class="section-title">Urgent Emails</div>
      ${createEmailCards(urgentEmails, 'urgent')}
    </div>
    <div class="section">
      <div class="section-title">Important Emails</div>
      ${createEmailCards(importantEmails, 'important')}
    </div>
    <div class="section">
      <div class="section-title">Emails Already Replied To</div>
      ${createEmailCards(repliedEmails, 'replied')}
    </div>
    <div class="section">
      <div class="section-title">General / Low Priority Emails</div>
      ${createEmailCards(otherEmails, 'other')}
    </div>
    <div class="section">
      <div class="section-title">Key Action Items</div>
      ${createActionItems(actionItems)}
    </div>
    <div class="section">
      <div class="section-title">Key Takeaways</div>
      <div class="summary">${escapeHtml(overallSummary)}</div>
    </div>
  </div>
  <div class="footer">Generated automatically by InboxIQ Email Intelligence Engine • Multi-Tenant SaaS Delivery</div>
</div>
</body>
</html>`;
}

/**
 * Self-contained Native Intelligence Execution Pipeline.
 * Executes the full Gmail fetch -> AI/Multi-signal synthesis -> HTML Report -> Gmail OAuth Send -> DB Sync pipeline
 * directly inside Next.js when the external n8n Cloud workspace is hibernating, offline (404), or unavailable.
 */
export async function executeNativeIntelligencePipeline({
  userId,
  userEmail,
  profession = 'professor_teacher',
  timezone = 'Asia/Kolkata',
  reportDate,
  executionId,
  correlationId,
  isTestRun = false,
}) {
  const startTimeMs = Date.now();
  const endWindow = new Date();
  const startWindow = new Date(endWindow.getTime() - 24 * 60 * 60 * 1000);

  // 1. Fetch verified user profile from Supabase
  const { data: userRow } = await supabaseAdmin
    .from('users')
    .select('id, email, name, profession, status')
    .eq('id', userId)
    .maybeSingle();

  const recipientEmail = userRow?.email || userEmail;
  const userName = userRow?.name || 'InboxIQ Member';
  const effectiveProfession = userRow?.profession || profession || 'student';

  let targetDate = reportDate;
  if (!targetDate) {
    try {
      targetDate = new Intl.DateTimeFormat('en-CA', { timeZone: timezone || 'Asia/Kolkata' }).format(new Date());
    } catch {
      targetDate = new Date().toISOString().split('T')[0];
    }
  }

  // 2. Fetch Slot 1 & Slot 2 emails concurrently
  const [slot1Emails, slot2Emails] = await Promise.all([
    fetchSlotEmails(userId, 1, startWindow, endWindow),
    fetchSlotEmails(userId, 2, startWindow, endWindow),
  ]);

  const seenIds = new Set();
  const deduplicatedEmails = [];
  for (const e of [...slot1Emails, ...slot2Emails]) {
    if (e && e.id && !seenIds.has(e.id)) {
      seenIds.add(e.id);
      deduplicatedEmails.push(e);
    }
  }

  // 3. Analyze & classify emails
  const analysis = await analyzeEmailsIntelligence({
    emails: deduplicatedEmails,
    profession: effectiveProfession,
    userName,
    reportDate: targetDate,
    windowStart: startWindow.toISOString(),
    windowEnd: endWindow.toISOString(),
  });

  // 4. Build HTML report
  const htmlContent = buildProfessionHtmlReport({
    report: analysis,
    profession: effectiveProfession,
    userName,
    userTimezone: timezone || 'Asia/Kolkata',
    reportDate: targetDate,
  });

  const subject = isTestRun
    ? `[TEST RUN] Daily Email Intelligence Report (${targetDate}) | InboxIQ`
    : `Daily Email Intelligence Report (${targetDate}) | InboxIQ`;

  // 5. Claim atomic email delivery lock (prevents duplicate emails if n8n and native engine ever race)
  // For explicit test runs triggered from admin, bypass duplicate lock so the test can be verified
  if (!isTestRun) {
    const { data: lockAcquired, error: lockErr } = await supabaseAdmin.rpc('claim_email_delivery_lock', {
      p_user_id: userId,
      p_report_date: targetDate,
      p_execution_id: executionId || null,
    });

    if (!lockErr && lockAcquired === false) {
      if (executionId) {
        await supabaseAdmin
          .from('workflow_executions')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            duration_ms: Date.now() - startTimeMs,
            emails_processed: deduplicatedEmails.length,
            error_message: `Report already delivered for ${recipientEmail} on ${targetDate}. Delivery skipped to prevent duplicate emails.`,
          })
          .eq('execution_id', executionId)
          .catch(() => {});
      }

      return {
        success: true,
        engine: 'inboxiq_native_engine',
        delivered: false,
        skipped: true,
        recipient: recipientEmail,
        report_date: targetDate,
        reason: `Report already delivered or actively sending for ${recipientEmail} on ${targetDate}.`,
      };
    }
  }

  // 5.5 Deliver via User's Connected Gmail (Slot 1 -> Slot 2) -> SMTP -> Platform Master Gmail OAuth
  const { data: userConns } = await supabaseAdmin
    .from('gmail_connections')
    .select('account_email, encrypted_refresh_token, connection_slot, status')
    .eq('user_id', userId)
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
        htmlContent,
      ];
      const rawMessage = messageParts.join('\r\n');
      const encodedMessage = Buffer.from(rawMessage)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const sendRes = await gmail.users.messages.send({
        userId: 'me',
        requestBody: { raw: encodedMessage },
      });

      deliveredMethod = methodLabel;
      messageId = sendRes.data?.id || null;
      return true;
    } catch (gmailErr) {
      console.warn(`[NativeEngine] Gmail OAuth delivery (${methodLabel}) failed:`, gmailErr.message);
      return false;
    }
  };

  for (const conn of userConns || []) {
    const sent = await trySendViaGmailConn(conn, `gmail_oauth_slot${conn.connection_slot || 1}`);
    if (sent) break;
  }

  if (!deliveredMethod) {
    const transporter = getEmailTransporter();
    if (transporter) {
      try {
        const fromEmail = process.env.EMAIL_FROM || process.env.EMAIL_USER || 'no-reply@inboxiq.online';
        const info = await transporter.sendMail({
          from: `"InboxIQ Intelligence" <${fromEmail}>`,
          to: recipientEmail,
          subject,
          html: htmlContent,
        });
        deliveredMethod = 'smtp';
        messageId = info.messageId;
      } catch (smtpErr) {
        console.warn('[NativeEngine] SMTP delivery failed:', smtpErr.message);
      }
    }
  }

  if (!deliveredMethod) {
    // Platform Master Gmail OAuth fallback (ensures future users still receive briefings if their slot lacks send permission)
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
    throw new Error('No valid email delivery channel available (Gmail connections and SMTP failed).');
  }

  const durationMs = Date.now() - startTimeMs;
  const nowIso = new Date().toISOString();

  // 6. Authoritatively update reports and workflow_executions in Supabase
  await Promise.all([
    supabaseAdmin
      .from('reports')
      .upsert(
        {
          user_id: userId,
          report_date: targetDate,
          report_type: 'daily',
          status: 'delivered',
          email_delivery_status: 'delivered',
          drive_upload_status: 'skipped',
          execution_id: executionId,
          executive_summary: analysis.overallSummary,
          key_metrics: {
            total_emails: analysis.totalEmails,
            urgent_count: analysis.urgentEmails.length,
            important_count: analysis.importantEmails.length,
            replied_count: analysis.repliedEmails.length,
            other_count: analysis.otherEmails.length,
            delivery_method: deliveredMethod,
            message_id: messageId,
            engine: 'inboxiq_native_engine',
          },
          generated_at: nowIso,
          updated_at: nowIso,
        },
        { onConflict: 'user_id,report_date,report_type' }
      ),
    executionId
      ? supabaseAdmin
          .from('workflow_executions')
          .update({
            status: 'completed',
            completed_at: nowIso,
            duration_ms: durationMs,
            emails_processed: analysis.totalEmails,
            error_category: null,
            error_message: null,
          })
          .eq('execution_id', executionId)
      : Promise.resolve(),
  ]);

  return {
    success: true,
    engine: 'inboxiq_native_engine',
    delivered: true,
    recipient: recipientEmail,
    delivery_method: deliveredMethod,
    message_id: messageId,
    report_date: targetDate,
    emails_processed: analysis.totalEmails,
    duration_ms: durationMs,
    executive_summary: analysis.overallSummary,
  };
}
