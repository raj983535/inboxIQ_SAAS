import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/clerk/auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { formatSafeErrorResponse, AppError, ErrorCategories } from '@/lib/errors';
import { generateCorrelationId, isValidIanaTimezone, checkRateLimit } from '@/lib/utils';

export async function POST(req) {
  const correlationId = generateCorrelationId();
  try {
    const user = await getAuthenticatedUser();

    // Rate limiting: Max 15 schedule updates per minute per user
    const rateLimit = checkRateLimit(`schedule_update_${user.id}`, 15, 60000);
    if (!rateLimit.allowed) {
      throw new AppError(ErrorCategories.RATE_LIMIT_ERROR, 'Too many update requests. Please wait a moment.', 429);
    }

    const body = await req.json().catch(() => ({}));

    const { reportTime, timezone, onboardingCompleted } = body;

    // Validate inputs
    if (!reportTime || !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(reportTime)) {
      throw new AppError(ErrorCategories.VALIDATION_ERROR, 'Invalid report time format. Use HH:MM', 400);
    }

    if (!isValidIanaTimezone(timezone)) {
      throw new AppError(ErrorCategories.VALIDATION_ERROR, 'Invalid IANA timezone identifier.', 400);
    }

    const updates = {
      report_time: reportTime,
      timezone: timezone,
      updated_at: new Date().toISOString(),
    };

    if (typeof onboardingCompleted === 'boolean') {
      updates.onboarding_completed = onboardingCompleted;
    }

    const { data: updatedSettings, error } = await supabaseAdmin
      .from('user_settings')
      .update(updates)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      throw new AppError(ErrorCategories.DATABASE_ERROR, 'Failed to update user schedule settings.', 500);
    }

    return NextResponse.json({
      success: true,
      settings: updatedSettings,
    });
  } catch (error) {
    const safeError = formatSafeErrorResponse(error, correlationId);
    return NextResponse.json(safeError, { status: safeError.status });
  }
}
