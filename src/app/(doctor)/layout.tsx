import { createServerSupabaseClient } from '@/lib/supabase-server';
import { Sidebar } from '@/components/layout/Sidebar';

export default async function DoctorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSupabaseClient();

  // DEMO MODE: Hardcoded doctor profile
  const user = { id: '11111111-1111-1111-1111-111111111111', email: 'doctor@test.com' };
  const profile = { id: user.id, role: 'doctor', full_name: 'Dr. Sarah Mitchell', email: user.email };

  // Get doctor's referral IDs for subqueries
  const { data: doctorReferrals } = await supabase
    .from('referrals')
    .select('id')
    .eq('doctor_id', user.id);

  const referralIds = doctorReferrals?.map((r) => r.id) || [];

  // Get unread message count
  const { count: unreadMessages } = await supabase
    .from('chat_messages')
    .select('*', { count: 'exact', head: true })
    .in('referral_id', referralIds.length > 0 ? referralIds : ['none'])
    .neq('sender_id', user.id)
    .eq('is_read', false);

  // Get pending staff tasks count
  const { count: pendingTasks } = await supabase
    .from('staff_scheduling_tasks')
    .select('*', { count: 'exact', head: true })
    .in('referral_id', referralIds.length > 0 ? referralIds : ['none'])
    .eq('status', 'PENDING');

  return (
    <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900">
      <Sidebar
        role="doctor"
        userName={profile.full_name || 'Doctor'}
        userEmail={profile.email || user.email || ''}
        unreadMessages={unreadMessages || 0}
        pendingTasks={pendingTasks || 0}
      />
      <main className="flex-1 ml-64 p-6">{children}</main>
    </div>
  );
}
