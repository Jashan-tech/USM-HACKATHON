import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase-server';

/**
 * Development-only route to bypass email verification
 * ONLY available when NODE_ENV=development and ENABLE_DEV_ROUTES=true
 *
 * Usage: GET /api/dev/verify-email?email=user@example.com
 */
export async function GET(request: NextRequest) {
  // Guard: Only allow in development mode
  if (
    process.env.NODE_ENV !== 'development' ||
    process.env.ENABLE_DEV_ROUTES !== 'true'
  ) {
    return NextResponse.json(
      { error: 'This endpoint is only available in development mode' },
      { status: 403 }
    );
  }

  const email = request.nextUrl.searchParams.get('email');

  if (!email) {
    return NextResponse.json(
      { error: 'Email parameter is required' },
      { status: 400 }
    );
  }

  try {
    const supabase = createAdminSupabaseClient();

    // Get user by email
    const { data: users, error: listError } = await supabase.auth.admin.listUsers();

    if (listError) {
      return NextResponse.json(
        { error: 'Failed to list users', details: listError.message },
        { status: 500 }
      );
    }

    const user = users.users.find((u) => u.email === email);

    if (!user) {
      return NextResponse.json(
        { error: 'User not found with this email' },
        { status: 404 }
      );
    }

    // Update user to confirm email
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      { email_confirm: true }
    );

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to verify email', details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Email verified for ${email}. You can now log in.`,
      userId: user.id,
    });
  } catch (error) {
    console.error('Dev verify email error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
