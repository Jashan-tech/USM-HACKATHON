// =============================================================================
// NEXUS HEALTH - Supabase Client Configuration (Client-safe exports)
// =============================================================================

import { createBrowserClient } from '@supabase/ssr';

// Environment variables (client-safe)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';

// =============================================================================
// BROWSER CLIENT
// For use in Client Components
// =============================================================================
export function createBrowserSupabaseClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

// =============================================================================
// REALTIME SUBSCRIPTION HELPER
// For setting up real-time listeners
// =============================================================================
export function subscribeToChannel(
  client: ReturnType<typeof createBrowserSupabaseClient>,
  channelName: string,
  table: string,
  filter: string,
  callback: (payload: unknown) => void
) {
  const channel = client
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table,
        filter,
      },
      callback
    )
    .subscribe();

  return () => {
    client.removeChannel(channel);
  };
}

// =============================================================================
// TYPE DEFINITIONS FOR SUPABASE
// =============================================================================
export type SupabaseClient = ReturnType<typeof createBrowserSupabaseClient>;

// =============================================================================
// NOTE: Server-side functions are in ./supabase-server.ts
// Import directly: import { createServerSupabaseClient } from '@/lib/supabase-server'
// =============================================================================
