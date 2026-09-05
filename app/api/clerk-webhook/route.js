import { NextResponse } from 'next/server';
import { Webhook } from 'svix';
import { supabaseAdmin } from '@/lib/supabase/server';
import { formatSafeErrorResponse, AppError, ErrorCategories } from '@/lib/errors';
import { generateCorrelationId } from '@/lib/utils';

export async function POST(req) {
  const correlationId = generateCorrelationId();
  try {
    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new AppError(ErrorCategories.CONFIGURATION_ERROR, 'CLERK_WEBHOOK_SECRET is not configured.', 500);
    }

    // Get Svix headers
    const svixId = req.headers.get('svix-id');
    const svixTimestamp = req.headers.get('svix-timestamp');
    const svixSignature = req.headers.get('svix-signature');

    if (!svixId || !svixTimestamp || !svixSignature) {
      throw new AppError(ErrorCategories.AUTH_ERROR, 'Missing Svix verification headers.', 400);
    }

    const payload = await req.text();
    const wh = new Webhook(webhookSecret);

    let event;
    try {
      event = wh.verify(payload, {
        'svix-id': svixId,
        'svix-timestamp': svixTimestamp,
        'svix-signature': svixSignature,
      });
    } catch (verifyErr) {
      throw new AppError(ErrorCategories.AUTH_ERROR, `Invalid Clerk webhook signature: ${verifyErr.message}`, 400);
    }

    const eventType = event.type;
    const data = event.data;

    if (eventType === 'user.created' || eventType === 'user.updated') {
      const clerkUserId = data.id;
      const primaryEmail = data.email_addresses?.[0]?.email_address || 'user@inboxiq.local';
      const name = `${data.first_name || ''} ${data.last_name || ''}`.trim() || 'InboxIQ User';
      const isAdmin = data.public_metadata?.role === 'admin' || process.env.ADMIN_EMAIL === primaryEmail;

      const { data: userRecord, error: userError } = await supabaseAdmin
        .from('users')
        .upsert(
          {
            clerk_user_id: clerkUserId,
            email: primaryEmail,
            name: name,
            image_url: data.image_url || null,
            role: isAdmin ? 'admin' : 'user',
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'clerk_user_id' }
        )
        .select()
        .single();

      if (userRecord) {
        // Ensure default settings exist
        await supabaseAdmin.from('user_settings').upsert(
          {
            user_id: userRecord.id,
            report_time: '08:00',
            timezone: 'Asia/Kolkata',
            max_gmail_connections: 2,
            onboarding_completed: false,
          },
          { onConflict: 'user_id' }
        );
      }
    } else if (eventType === 'user.deleted') {
      const clerkUserId = data.id;
      await supabaseAdmin.from('users').delete().eq('clerk_user_id', clerkUserId);
    }

    return NextResponse.json({ success: true, event: eventType });
  } catch (error) {
    const safeError = formatSafeErrorResponse(error, correlationId);
    return NextResponse.json(safeError, { status: safeError.status });
  }
}
