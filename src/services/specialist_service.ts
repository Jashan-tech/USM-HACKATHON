// =============================================================================
// REFREE - Specialist Service
// NPI Registry lookups and specialist ranking
// =============================================================================

import { Specialist, SpecialistSearchResult } from '@/types';
import { getCached, setCached } from '@/lib/redis';
import { calculateDistance } from '@/lib/utils';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// NPI Registry API endpoint
const NPI_REGISTRY_URL = 'https://npiregistry.cms.hhs.gov/api';

// Cache TTL: 30 days in seconds
const CACHE_TTL = 30 * 24 * 60 * 60;

// =============================================================================
// SPECIALTY MAPPINGS
// =============================================================================

const SPECIALTY_TAXONOMY_MAP: Record<string, string[]> = {
  Cardiology: ['207RC0000X', '207RI0011X', '207RI0001X'],
  Orthopedics: ['207X00000X', '207XS0106X', '207XS0117X'],
  Gastroenterology: ['207RG0100X', '207RG0300X'],
  Pulmonology: ['207RP1001X', '207RT0003X'],
  Psychiatry: ['2084P0800X', '2084P0802X', '2084P0804X'],
  Nephrology: ['207RN0300X'],
  Endocrinology: ['207RE0101X'],
  Dermatology: ['207N00000X', '207NP0225X'],
  Radiology: ['2085R0202X', '2085R0001X'],
  'Hospice Care': ['251G00000X', '251B00000X'],
  Neurology: ['2084N0400X', '2084N0402X'],
  Oncology: ['207RX0202X', '2080P0214X'],
  Rheumatology: ['207RR0500X'],
  Urology: ['208800000X'],
  Ophthalmology: ['207W00000X', '207WX0102X'],
};

// =============================================================================
// NPI REGISTRY SEARCH
// =============================================================================

interface NPIResult {
  result_count: number;
  results: NPIRecord[];
}

interface NPIRecord {
  number: string;
  basic: {
    first_name?: string;
    last_name?: string;
    organization_name?: string;
    gender?: string;
  };
  taxonomies: {
    code: string;
    desc: string;
    primary: boolean;
    state?: string;
  }[];
  addresses: {
    address_purpose: string;
    address_1: string;
    address_2?: string;
    city: string;
    state: string;
    postal_code: string;
    telephone_number?: string;
  }[];
}

/**
 * Search NPI Registry for specialists
 */
export async function searchNPIRegistry(
  specialty: string,
  state?: string,
  city?: string,
  limit: number = 20
): Promise<Specialist[]> {
  // Get taxonomy codes for specialty
  const taxonomyCodes = SPECIALTY_TAXONOMY_MAP[specialty];
  if (!taxonomyCodes || taxonomyCodes.length === 0) {
    console.warn(`No taxonomy codes found for specialty: ${specialty}`);
    return [];
  }

  // Build search URL
  const params = new URLSearchParams({
    version: '2.1',
    taxonomy_description: specialty,
    limit: limit.toString(),
    enumeration_type: 'NPI-1', // Individual providers
  });

  if (state) {
    params.append('state', state);
  }
  if (city) {
    params.append('city', city);
  }

  const cacheKey = `npi:${specialty}:${state || ''}:${city || ''}:${limit}`;

  // Check cache first
  const cached = await getCached<Specialist[]>(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(`${NPI_REGISTRY_URL}/?${params}`, {
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`NPI API error: ${response.status}`);
    }

    const data: NPIResult = await response.json();

    const specialists = data.results.map((record) => transformNPIRecord(record, specialty));

    // Cache results
    await setCached(cacheKey, specialists, CACHE_TTL);

    return specialists;
  } catch (error) {
    console.error('NPI Registry search failed:', error);
    // Fall back to cached specialists
    return await searchCachedSpecialists(specialty, state, city, limit);
  }
}

/**
 * Transform NPI record to Specialist type
 */
function transformNPIRecord(record: NPIRecord, specialty: string): Specialist {
  const practiceAddress = record.addresses.find(
    (a) => a.address_purpose === 'LOCATION'
  ) || record.addresses[0];

  const primaryTaxonomy = record.taxonomies.find((t) => t.primary) || record.taxonomies[0];

  return {
    npi: record.number,
    first_name: record.basic.first_name,
    last_name: record.basic.last_name,
    organization_name: record.basic.organization_name,
    specialty,
    taxonomy_code: primaryTaxonomy?.code,
    taxonomy_description: primaryTaxonomy?.desc,
    address_line1: practiceAddress?.address_1,
    address_line2: practiceAddress?.address_2,
    city: practiceAddress?.city,
    state: practiceAddress?.state,
    postal_code: practiceAddress?.postal_code,
    phone: practiceAddress?.telephone_number,
    display_name: record.basic.organization_name ||
      `Dr. ${record.basic.first_name} ${record.basic.last_name}`,
  };
}

// =============================================================================
// CACHED SPECIALISTS (FROM DATABASE)
// =============================================================================

/**
 * Search cached specialists from database
 */
async function searchCachedSpecialists(
  specialty: string,
  state?: string,
  city?: string,
  limit: number = 20
): Promise<Specialist[]> {
  const supabase = await createServerSupabaseClient();

  let query = supabase
    .from('specialist_cache')
    .select('*')
    .eq('specialty', specialty);

  if (state) {
    query = query.eq('state', state);
  }
  if (city) {
    query = query.ilike('city', `%${city}%`);
  }

  const { data, error } = await query
    .order('rank_score', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching cached specialists:', error);
    return [];
  }

  return data as Specialist[];
}

// =============================================================================
// SPECIALIST RANKING
// =============================================================================

/**
 * Rank specialists using transparent formula
 * rank_score = (
 *   0.35 * normalize(mips_quality_score, 0, 100) +
 *   0.25 * normalize(annual_service_volume, 0, max_volume) +
 *   0.25 * (1 - normalize(distance_miles, 0, 50)) +
 *   0.15 * (1 - normalize(estimated_wait_days, 0, 60))
 * ) * 100
 */
export function rankSpecialists(
  specialists: Specialist[],
  patientLat?: number,
  patientLng?: number
): Specialist[] {
  // Find max volume for normalization
  const maxVolume = Math.max(
    ...specialists.map((s) => s.annual_service_volume || 0),
    1000
  );

  return specialists
    .map((specialist) => {
      // Calculate distance if coordinates available
      let distanceMiles: number | undefined;
      if (patientLat && patientLng && specialist.latitude && specialist.longitude) {
        distanceMiles = calculateDistance(
          patientLat,
          patientLng,
          specialist.latitude,
          specialist.longitude
        );
      }

      // Calculate rank score
      const qualityScore = normalize(specialist.mips_quality_score || 50, 0, 100);
      const volumeScore = normalize(specialist.annual_service_volume || 0, 0, maxVolume);
      const distanceScore = distanceMiles !== undefined
        ? 1 - normalize(distanceMiles, 0, 50)
        : 0.5; // Default if no location
      const waitScore = 1 - normalize(specialist.estimated_wait_days || 14, 0, 60);

      const rankScore = (
        0.35 * qualityScore +
        0.25 * volumeScore +
        0.25 * distanceScore +
        0.15 * waitScore
      ) * 100;

      return {
        ...specialist,
        distance_miles: distanceMiles,
        rank_score: Math.round(rankScore * 10) / 10,
      };
    })
    .sort((a, b) => (b.rank_score || 0) - (a.rank_score || 0));
}

function normalize(value: number, min: number, max: number): number {
  if (max === min) return 0.5;
  return Math.max(0, Math.min(1, (value - min) / (max - min)));
}

// =============================================================================
// MAIN SEARCH FUNCTION
// =============================================================================

/**
 * Search and rank specialists
 */
export async function searchSpecialists(
  specialty: string,
  city?: string,
  state?: string,
  limit: number = 10,
  patientLat?: number,
  patientLng?: number
): Promise<SpecialistSearchResult> {
  // Try cached specialists first (faster)
  let specialists = await searchCachedSpecialists(specialty, state, city, limit * 2);
  let cached = true;

  // If not enough cached results, search NPI Registry
  if (specialists.length < limit) {
    try {
      const npiResults = await searchNPIRegistry(specialty, state, city, limit);
      specialists = [...specialists, ...npiResults];
      cached = specialists.length > npiResults.length;
    } catch (error) {
      console.error('NPI search failed:', error);
    }
  }

  // Remove duplicates by NPI
  const uniqueSpecialists = Array.from(
    new Map(specialists.map((s) => [s.npi, s])).values()
  );

  // Rank specialists
  const rankedSpecialists = rankSpecialists(uniqueSpecialists, patientLat, patientLng);

  return {
    specialists: rankedSpecialists.slice(0, limit),
    total: rankedSpecialists.length,
    cached,
  };
}

/**
 * Get a single specialist by NPI
 */
export async function getSpecialistByNPI(npi: string): Promise<Specialist | null> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from('specialist_cache')
    .select('*')
    .eq('npi', npi)
    .single();

  if (error || !data) {
    // Try NPI Registry
    try {
      const response = await fetch(
        `${NPI_REGISTRY_URL}/?version=2.1&number=${npi}`,
        { headers: { Accept: 'application/json' } }
      );

      if (response.ok) {
        const result: NPIResult = await response.json();
        if (result.results.length > 0) {
          return transformNPIRecord(result.results[0], 'Unknown');
        }
      }
    } catch (err) {
      console.error('NPI lookup failed:', err);
    }
    return null;
  }

  return data as Specialist;
}
