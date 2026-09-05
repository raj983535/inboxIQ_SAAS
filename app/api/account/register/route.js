import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { formatSafeErrorResponse, AppError, ErrorCategories } from '@/lib/errors';
import { generateCorrelationId } from '@/lib/utils';

export async function POST(req) {
  const correlationId = generateCorrelationId();
  try {
    const body = await req.json();
    const {
      name,
      email,
      gender,
      profession,
      country,
      reportTime = '08:00',
      timezone = 'Asia/Kolkata',
      clerkUserId = null,
    } = body;

    // Validate mandatory fields
    if (!name || !email || !gender || !profession || !country) {
      throw new AppError(
        ErrorCategories.VALIDATION_ERROR,
        'Name, Email, Gender, Profession, and Country are mandatory registration fields.',
        400
      );
    }

    const validGenders = ['male', 'female', 'non_binary', 'prefer_not_to_say'];
    if (!validGenders.includes(gender.toLowerCase())) {
      throw new AppError(ErrorCategories.VALIDATION_ERROR, 'Invalid gender selection.', 400);
    }

    const validProfessions = ['professor_teacher', 'student', 'others'];
    if (!validProfessions.includes(profession.toLowerCase())) {
      throw new AppError(ErrorCategories.VALIDATION_ERROR, 'Invalid profession selection.', 400);
    }

    const effectiveClerkId = clerkUserId || `user_dev_${Date.now()}`;

    // Upsert into public.users
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .upsert(
        {
          clerk_user_id: effectiveClerkId,
          email: email.trim().toLowerCase(),
          name: name.trim(),
          gender: gender.toLowerCase(),
          profession: profession.toLowerCase(),
          country: country.trim(),
          role: 'user',
          status: 'active',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'email' }
      )
      .select()
      .single();

    if (userError) {
      console.error('Registration user insert error:', userError);
      throw new AppError(ErrorCategories.DATABASE_ERROR, 'Failed to save registration profile.', 500);
    }

    // Create / update user settings
    await supabaseAdmin.from('user_settings').upsert(
      {
        user_id: user.id,
        report_time: reportTime,
        timezone: timezone,
        max_gmail_connections: 2,
        onboarding_completed: false,
      },
      { onConflict: 'user_id' }
    );

    return NextResponse.json({
      success: true,
      user,
      message: 'Registration data recorded successfully.',
    });
  } catch (error) {
    const safeError = formatSafeErrorResponse(error, correlationId);
    return NextResponse.json(safeError, { status: safeError.status });
  }
}
