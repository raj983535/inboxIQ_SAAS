import { NextResponse } from 'next/server';
import { sendContactEmail } from '@/lib/email';
import { generateCorrelationId } from '@/lib/utils';

export const dynamic = 'force-dynamic';

// In-memory rate limiting map for basic spam protection (keyed by client IP)
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_REQUESTS_PER_WINDOW = 5;

function isRateLimited(ip) {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  if (now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    return true;
  }

  record.count += 1;
  return false;
}

// Basic email regex validator
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export async function POST(req) {
  const correlationId = generateCorrelationId();
  try {
    // 1. Check IP rate limit
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'anonymous';
    if (isRateLimited(ip)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many messages sent. Please wait a few minutes before trying again or email us directly at sahilrajppm2022@gmail.com.',
          },
        },
        { status: 429 }
      );
    }

    // 2. Parse request body
    const body = await req.json().catch(() => ({}));
    const { name, email, subject, message, website, load_time } = body;

    // 3. Anti-Bot Defense Layer
    // A. Honeypot check: Bots fill in hidden inputs, humans never do.
    if (website && typeof website === 'string' && website.trim().length > 0) {
      console.warn('[Contact Spam Blocked] Honeypot field filled by bot:', { ip, email, website });
      return NextResponse.json({ success: true, simulated: true });
    }

    // B. Time-to-submit check: Headless automated scripts submit in < 2.5 seconds.
    if (load_time && !isNaN(Number(load_time))) {
      const elapsedMs = Date.now() - Number(load_time);
      if (elapsedMs < 2000) {
        console.warn('[Contact Spam Blocked] Form submitted too quickly by bot script:', { ip, email, elapsedMs });
        return NextResponse.json({ success: true, simulated: true });
      }
    }

    // C. Gibberish / Bot Token pattern check:
    // Notice bot spam patterns like `uVymAqlekRJafVaKnakVmy` (single long token with no spaces).
    const isSingleLongToken = (str) => typeof str === 'string' && str.trim().length >= 15 && !str.includes(' ');
    if (isSingleLongToken(message) || (subject && isSingleLongToken(subject))) {
      console.warn('[Contact Spam Blocked] Message or subject is an unspaced bot token:', { ip, email, message });
      return NextResponse.json({ success: true, simulated: true });
    }

    // 4. Server-side validation
    if (!name || typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 100) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Please provide a valid full name (2–100 characters).',
          },
        },
        { status: 400 }
      );
    }

    if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim()) || email.trim().length > 150) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Please provide a valid email address.',
          },
        },
        { status: 400 }
      );
    }

    if (subject && (typeof subject !== 'string' || subject.trim().length > 200)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Subject cannot exceed 200 characters.',
          },
        },
        { status: 400 }
      );
    }

    if (!message || typeof message !== 'string' || message.trim().length < 10 || message.trim().length > 3000) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Please provide a descriptive message (10–3000 characters).',
          },
        },
        { status: 400 }
      );
    }

    // 4. Send email via Nodemailer
    const result = await sendContactEmail({
      name: name.trim(),
      email: email.trim(),
      subject: subject?.trim() || null,
      message: message.trim(),
    });

    return NextResponse.json({
      success: true,
      message: "Your message has been sent successfully. We'll get back to you soon.",
      correlationId,
    });
  } catch (error) {
    console.error('[POST /api/contact] Email delivery failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'EMAIL_DELIVERY_FAILED',
          message: "We couldn't send your message right now. Please try again or email us directly at sahilrajppm2022@gmail.com.",
        },
        correlationId,
      },
      { status: 500 }
    );
  }
}
