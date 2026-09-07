import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/clerk/auth';
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

    const authenticatedUser = await getAuthenticatedUser();
    const normalizedEmail = email.trim().toLowerCase();
    if (normalizedEmail !== authenticatedUser.email.toLowerCase()) {
      throw new AppError(ErrorCategories.AUTH_ERROR, 'Registration email must match the signed-in account.', 403);
    }

    // Check if user already exists with this email
    const { data: existingUsers, error: lookupErr } = await supabaseAdmin
      .from('users')
      .select('id, clerk_user_id')
      .eq('email', normalizedEmail)
      .limit(1);

    if (lookupErr) {
      console.error('User lookup error:', lookupErr);
    }

    const existingUser = existingUsers && existingUsers.length > 0 ? existingUsers[0] : null;

    let user;
    if (existingUser) {
      if (existingUser.id !== authenticatedUser.id) {
        throw new AppError(ErrorCategories.AUTH_ERROR, 'An account already exists for this email.', 409);
      }
      const updatePayload = {
        name: name.trim(),
        gender: gender.toLowerCase(),
        profession: profession.toLowerCase(),
        country: country.trim(),
        updated_at: new Date().toISOString(),
      };
      const { data: updatedUser, error: updateErr } = await supabaseAdmin
        .from('users')
        .update(updatePayload)
        .eq('id', existingUser.id)
        .select()
        .single();

      if (updateErr) {
        console.error('Registration user update error:', updateErr);
        throw new AppError(
          ErrorCategories.DATABASE_ERROR,
          `Failed to save registration profile: ${updateErr.message || updateErr.details || 'Update failed'}`,
          500
        );
      }
      user = updatedUser;
    } else {
      const { data: insertedUser, error: insertErr } = await supabaseAdmin
        .from('users')
        .insert({
          clerk_user_id: authenticatedUser.clerk_user_id,
          email: normalizedEmail,
          name: name.trim(),
          gender: gender.toLowerCase(),
          profession: profession.toLowerCase(),
          country: country.trim(),
          role: 'user',
          status: 'active',
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertErr) {
        console.error('Registration user insert error:', insertErr);
        throw new AppError(
          ErrorCategories.DATABASE_ERROR,
          `Failed to save registration profile: ${insertErr.message || insertErr.details || 'Insert failed'}`,
          500
        );
      }
      user = insertedUser;
    }

    // Create / update user settings
    const { error: settingsErr } = await supabaseAdmin.from('user_settings').upsert(
      {
        user_id: user.id,
        report_time: reportTime,
        timezone: timezone,
        max_gmail_connections: 2,
        onboarding_completed: false,
      },
      { onConflict: 'user_id' }
    );

    if (settingsErr) {
      console.error('User settings upsert error:', settingsErr);
      throw new AppError(
        ErrorCategories.DATABASE_ERROR,
        `Failed to initialize user settings: ${settingsErr.message || settingsErr.details}`,
        500
      );
    }

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
