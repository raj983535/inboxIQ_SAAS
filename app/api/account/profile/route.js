import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/clerk/auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { AppError, ErrorCategories, formatSafeErrorResponse } from '@/lib/errors';
import { generateCorrelationId } from '@/lib/utils';

const GENDERS = new Set(['male', 'female', 'non_binary', 'prefer_not_to_say']);
const PROFESSIONS = new Set(['professor_teacher', 'student', 'others']);
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export async function POST(req) {
  const correlationId = generateCorrelationId();
  try {
    const user = await getAuthenticatedUser();
    const { name, gender, profession, country, reportTime, timezone } = await req.json();

    if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 120) {
      throw new AppError(ErrorCategories.VALIDATION_ERROR, 'Please enter your full name (2–120 characters).', 400);
    }
    if (!GENDERS.has(gender) || !PROFESSIONS.has(profession)) {
      throw new AppError(ErrorCategories.VALIDATION_ERROR, 'Please choose a valid gender and profession.', 400);
    }
    if (typeof country !== 'string' || country.trim().length < 2 || country.trim().length > 100) {
      throw new AppError(ErrorCategories.VALIDATION_ERROR, 'Please enter a valid country.', 400);
    }
    if (!TIME_PATTERN.test(reportTime) || typeof timezone !== 'string' || timezone.length > 100) {
      throw new AppError(ErrorCategories.VALIDATION_ERROR, 'Please choose a valid delivery time and timezone.', 400);
    }

    const { error: profileError } = await supabaseAdmin.from('users').update({
      name: name.trim(),
      gender,
      profession,
      country: country.trim(),
      updated_at: new Date().toISOString(),
    }).eq('id', user.id);
    if (profileError) {
      console.error('Profile update error:', profileError);
      throw new AppError(ErrorCategories.DATABASE_ERROR, 'Unable to save your profile: ' + profileError.message, 500);
    }

    // Check if user_settings exists
    const { data: existingSettings } = await supabaseAdmin
      .from('user_settings')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    let settingsError = null;
    const settingsPayload = {
      report_time: reportTime,
      timezone,
      max_gmail_connections: 2,
      profile_completed: true,
      onboarding_completed: false,
      updated_at: new Date().toISOString(),
    };

    if (existingSettings) {
      const res = await supabaseAdmin
        .from('user_settings')
        .update(settingsPayload)
        .eq('user_id', user.id);
      settingsError = res.error;
    } else {
      const res = await supabaseAdmin
        .from('user_settings')
        .insert({
          user_id: user.id,
          ...settingsPayload,
        });
      settingsError = res.error;
    }

    if (settingsError) {
      console.warn('user_settings primary write error, attempting resilient fallback:', settingsError.message);
      const fallbackPayload = {
        report_time: reportTime,
        timezone,
        max_gmail_connections: 2,
        onboarding_completed: false,
        updated_at: new Date().toISOString(),
      };
      const fallbackRes = existingSettings
        ? await supabaseAdmin.from('user_settings').update(fallbackPayload).eq('user_id', user.id)
        : await supabaseAdmin.from('user_settings').insert({ user_id: user.id, ...fallbackPayload });
      
      if (fallbackRes.error) {
        console.error('user_settings fallback error:', fallbackRes.error);
        throw new AppError(ErrorCategories.DATABASE_ERROR, 'Unable to save your delivery settings: ' + fallbackRes.error.message, 500);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const safeError = formatSafeErrorResponse(error, correlationId);
    return NextResponse.json(safeError, { status: safeError.status });
  }
}
