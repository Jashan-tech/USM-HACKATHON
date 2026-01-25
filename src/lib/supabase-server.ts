// =============================================================================
// REFREE - Supabase Server-side Configuration
// These exports use next/headers and can ONLY be used in server contexts
// =============================================================================

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

// Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder';

// =============================================================================
// SERVER CLIENT
// For use in Server Components, Route Handlers, and Server Actions
// =============================================================================
export async function createServerSupabaseClient() {
    const cookieStore = await cookies();

    return createServerClient(supabaseUrl, supabaseAnonKey, {
        cookies: {
            getAll() {
                return cookieStore.getAll();
            },
            setAll(cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>) {
                try {
                    cookiesToSet.forEach(({ name, value, options }) =>
                        cookieStore.set(name, value, options)
                    );
                } catch {
                    // The `setAll` method was called from a Server Component.
                    // This can be ignored if you have middleware refreshing sessions.
                }
            },
        },
    });
}

// =============================================================================
// ADMIN CLIENT
// For use in server-side operations that need to bypass RLS
// NEVER expose to browser!
// =============================================================================
export function createAdminSupabaseClient() {
    if (!supabaseServiceRoleKey) {
        throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for admin operations');
    }

    return createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });
}

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================
export type ServerSupabaseClient = Awaited<ReturnType<typeof createServerSupabaseClient>>;
export type AdminSupabaseClient = ReturnType<typeof createAdminSupabaseClient>;
