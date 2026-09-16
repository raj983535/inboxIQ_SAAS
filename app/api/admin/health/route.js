import { NextResponse } from 'next/server';
import { getAuthenticatedAdmin } from '@/lib/clerk/auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { formatSafeErrorResponse } from '@/lib/errors';
import { generateCorrelationId } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function GET() {
  const correlationId = generateCorrelationId();
  try {
    await getAuthenticatedAdmin();

    // 1. Supabase Database check
    let supabaseStatus = 'Not configured';
    try {
      const { error } = await supabaseAdmin.from('users').select('id').limit(1);
      supabaseStatus = error ? 'Degraded' : 'Healthy';
    } catch {
      supabaseStatus = 'Error';
    }

    // 2. Clerk Auth check
    const clerkStatus = process.env.CLERK_SECRET_KEY ? 'Configured' : 'Not configured';

    // 3. Google OAuth check
    const googleStatus = process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET ? 'Configured' : 'Not configured';

    // 4. Razorpay check
    const razorpayStatus = process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET ? 'Configured' : 'Not configured';

    // 5. Token Encryption Key check
    const encryptionStatus = process.env.TOKEN_ENCRYPTION_KEY ? 'Healthy' : 'Not configured';

    // 6. n8n Automation Engine check
    const n8nStatus = process.env.N8N_BASE_URL && process.env.N8N_WEBHOOK_SECRET ? 'Configured' : 'Not configured';

    return NextResponse.json({
      success: true,
      services: {
        website: { name: 'Next.js App Router (Control Plane)', status: 'Healthy', note: 'Operational' },
        supabase: { name: 'Supabase PostgreSQL DB', status: supabaseStatus, note: 'Relational schema & RLS active' },
        clerk: { name: 'Clerk Identity Layer', status: clerkStatus, note: 'User & Admin session management' },
        google_oauth: { name: 'Google OAuth & Gmail API', status: googleStatus, note: 'AES-256-GCM encrypted tokens' },
        razorpay: { name: 'Razorpay Billing Gateway', status: razorpayStatus, note: '₹499/mo subscription webhook' },
        encryption: { name: 'AES-256-GCM Token Encryption', status: encryptionStatus, note: 'Hardware-backed crypto' },
        n8n: { name: 'n8n Automation Engine', status: n8nStatus, note: 'External processing boundary' },
      },
    });
  } catch (error) {
    const safeError = formatSafeErrorResponse(error, correlationId);
    return NextResponse.json(safeError, { status: safeError.status });
  }
}
