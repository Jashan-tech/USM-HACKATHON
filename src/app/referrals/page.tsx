import { createServerSupabaseClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';

export default async function ReferralsRedirectPage() {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // If not logged in, redirect to login
    redirect('/login');
  }

  // Fetch user profile to determine role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile) {
    // If no profile found, redirect to login
    redirect('/login');
  }

  // Redirect based on role
  switch (profile.role) {
    case 'doctor':
      redirect('/doctor/referrals');
    case 'patient':
      redirect('/patient/home');
    case 'staff':
      redirect('/staff/queue');
    default:
      redirect('/login');
  }
}