import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { checkRateLimit } from '@/lib/redis';
import { searchSpecialists } from '@/services/specialist_service';
import { specialistSearchSchema } from '@/lib/validations';


// GET /api/specialists - Search for specialists
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting - stricter for NPI API calls
    const rateLimit = await checkRateLimit(`specialists:${user.id}`, 10, 60000);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded. Please wait before searching again.',
          remaining: rateLimit.remaining,
          resetAt: rateLimit.resetAt,
        },
        { status: 429 }
      );
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const params = {
      specialty: searchParams.get('specialty') || '',
      city: searchParams.get('city') || undefined,
      state: searchParams.get('state') || undefined,
      limit: searchParams.get('limit') || '10',
      patient_lat: searchParams.get('patient_lat') || undefined,
      patient_lng: searchParams.get('patient_lng') || undefined,
    };

    // Validate parameters
    const validationResult = specialistSearchSchema.safeParse(params);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { specialty, city, state, limit, patient_lat, patient_lng } =
      validationResult.data;

    // Search specialists
    const result = await searchSpecialists(
      specialty,
      city,
      state,
      limit,
      patient_lat,
      patient_lng
    );

    return NextResponse.json({
      data: result.specialists,
      meta: {
        total: result.total,
        cached: result.cached,
        limit,
      },
    });
  } catch (error) {
    console.error('Specialists search error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
