import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { checkRateLimit } from '@/lib/redis';
import { createBookingSchema } from '@/lib/validations';

// POST /api/bookings - Create a new booking
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting
    const rateLimit = await checkRateLimit(`bookings:${user.id}`, 10, 60000);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = createBookingSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Verify user has access to this referral
    const { data: referral } = await supabase
      .from('referrals')
      .select('id, doctor_id, patient_id, status')
      .eq('id', data.referral_id)
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
      profile.role === 'patient' && referral.patient_id !== user.id
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if booking already exists (idempotency)
    const { data: existingBooking } = await supabase
      .from('bookings')
      .select('id')
      .eq('referral_id', data.referral_id)
      .single();

    if (existingBooking) {
      return NextResponse.json(
        { error: 'Booking already exists for this referral' },
        { status: 409 }
      );
    }

    // Determine booked_by based on role
    const booked_by = profile.role === 'staff' ? 'STAFF' : 'PATIENT';

    // Generate confirmation number
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let confirmationNumber = '';
    for (let i = 0; i < 8; i++) {
      confirmationNumber += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    // Create booking
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        referral_id: data.referral_id,
        booked_slot_start_at: data.booked_slot_start_at,
        booked_slot_end_at: data.booked_slot_end_at,
        booked_by,
        specialist_npi: data.specialist_npi,
        specialist_name: data.specialist_name,
        location_address: data.location_address,
        visit_type: data.visit_type,
        confirmation_number: confirmationNumber,
      })
      .select()
      .single();

    if (bookingError) {
      // Check for unique constraint violation (double-booking prevention)
      if (bookingError.code === '23505') {
        return NextResponse.json(
          { error: 'Booking already exists for this referral' },
          { status: 409 }
        );
      }
      throw bookingError;
    }

    // Update referral status
    await supabase
      .from('referrals')
      .update({
        status: 'APPOINTMENT_BOOKED',
        selected_specialist_npi: data.specialist_npi,
        last_updated_by: user.id,
      })
      .eq('id', data.referral_id);

    // Create metric event
    await supabase.from('referral_metrics').insert({
      referral_id: data.referral_id,
      event_type: 'APPOINTMENT_BOOKED',
      event_data: {
        booked_by,
        confirmation_number: confirmationNumber,
        specialist_npi: data.specialist_npi,
      },
      actor_id: user.id,
      actor_role: profile.role,
    });

    // Send system message to chat
    await supabase.from('chat_messages').insert({
      referral_id: data.referral_id,
      sender_id: user.id,
      sender_role: 'system',
      message_text: `Appointment booked for ${new Date(data.booked_slot_start_at).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })}. Confirmation #: ${confirmationNumber}`,
      message_type: 'SYSTEM',
    });

    return NextResponse.json({ data: booking }, { status: 201 });
  } catch (error) {
    console.error('Create booking error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
