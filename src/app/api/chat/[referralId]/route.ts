import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { checkRateLimit } from '@/lib/redis';
import { sendMessageSchema } from '@/lib/validations';
import { sendMessage, getMessages, markMessagesAsRead } from '@/services/chat_service';

// GET /api/chat/[referralId] - Get messages for a referral
export async function GET(
  request: NextRequest,
  { params }: { params: { referralId: string } }
) {
  try {
    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user has access to this referral
    const { data: referral } = await supabase
      .from('referrals')
      .select('id, doctor_id, patient_id')
      .eq('id', params.referralId)
      .single();

    if (!referral) {
      return NextResponse.json(
        { error: 'Referral not found' },
        { status: 404 }
      );
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Authorization check
    if (
      profile.role === 'doctor' && referral.doctor_id !== user.id ||
      profile.role === 'patient' && referral.patient_id !== user.id
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get query params
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get messages
    const messages = await getMessages(params.referralId, limit, offset);

    // Mark messages as read
    await markMessagesAsRead(params.referralId, user.id);

    return NextResponse.json({ data: messages });
  } catch (error) {
    console.error('Get messages error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/chat/[referralId] - Send a message
export async function POST(
  request: NextRequest,
  { params }: { params: { referralId: string } }
) {
  try {
    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting
    const rateLimit = await checkRateLimit(`chat:${user.id}`, 30, 60000);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    // Verify user has access to this referral
    const { data: referral } = await supabase
      .from('referrals')
      .select('id, doctor_id, patient_id')
      .eq('id', params.referralId)
      .single();

    if (!referral) {
      return NextResponse.json(
        { error: 'Referral not found' },
        { status: 404 }
      );
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Authorization check
    if (
      profile.role === 'doctor' && referral.doctor_id !== user.id ||
      profile.role === 'patient' && referral.patient_id !== user.id
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = sendMessageSchema.safeParse({
      ...body,
      referral_id: params.referralId,
    });

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    // Send message
    const message = await sendMessage(
      validationResult.data,
      user.id,
      profile.role
    );

    return NextResponse.json({ data: message }, { status: 201 });
  } catch (error) {
    console.error('Send message error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
