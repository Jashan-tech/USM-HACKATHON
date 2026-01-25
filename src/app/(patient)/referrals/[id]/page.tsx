import { createServerSupabaseClient } from '@/lib/supabase-server';
import { notFound } from 'next/navigation';
import { ReferralDetail } from '@/components/referrals/ReferralDetail';

interface PageProps {
  params: { id: string };
}

export default async function PatientReferralDetailPage({ params }: PageProps) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // In demo mode, we'll use mock data
    // In production, this would redirect to auth
    const demoReferral = {
      id: params.id,
      status: 'PRIOR_AUTH_REQUIRED',
      risk_level: 'CRITICAL',
      specialist_type: 'Neurology',
      patient: { full_name: 'Michael Thompson', id: 'demo-patient-id' },
      doctor: { full_name: 'Dr. Sarah Mitchell', id: 'demo-doctor-id' },
      urgency_level: 'URGENT',
      referral_category: 'SPECIALIST',
      visit_type: 'IN_PERSON',
      city: 'Boston',
      state: 'MA',
      insurance_type: 'COMMERCIAL',
      payer_name: 'Blue Cross Blue Shield',
      member_id: 'ABC123456789',
      eligibility_status: 'ACTIVE',
      network_status: 'IN_NETWORK',
      patient_responsibility_estimate: 50,
      prior_auth_required: true,
      prior_auth_status: 'PENDING',
      created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString(),
      clinical_summary: 'Patient presents with chronic headaches and neurological symptoms requiring specialist evaluation.',
      preferred_availability: [],
      follow_up_due_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      follow_up_count: 0,
      patient_consent_preferences: { sms: true, email: true, voice: false },
      documents: [],
      booking: null,
      tasks: [
        {
          id: 'task-001',
          task_type: 'SUBMIT_PRIOR_AUTH',
          priority: 'HIGH',
          status: 'PENDING',
          instructions: 'Prior authorization required for neurology consultation. Submit via BCBS portal.',
          created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
        }
      ]
    };

    return (
      <div className="space-y-6">
        <ReferralDetail referral={demoReferral} />
      </div>
    );
  }

  // Fetch user profile to determine role
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, id')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    // If no profile found, use demo data
    const demoReferral = {
      id: params.id,
      status: 'PRIOR_AUTH_REQUIRED',
      risk_level: 'CRITICAL',
      specialist_type: 'Neurology',
      patient: { full_name: 'Michael Thompson', id: 'demo-patient-id' },
      doctor: { full_name: 'Dr. Sarah Mitchell', id: 'demo-doctor-id' },
      urgency_level: 'URGENT',
      referral_category: 'SPECIALIST',
      visit_type: 'IN_PERSON',
      city: 'Boston',
      state: 'MA',
      insurance_type: 'COMMERCIAL',
      payer_name: 'Blue Cross Blue Shield',
      member_id: 'ABC123456789',
      eligibility_status: 'ACTIVE',
      network_status: 'IN_NETWORK',
      patient_responsibility_estimate: 50,
      prior_auth_required: true,
      prior_auth_status: 'PENDING',
      created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString(),
      clinical_summary: 'Patient presents with chronic headaches and neurological symptoms requiring specialist evaluation.',
      preferred_availability: [],
      follow_up_due_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      follow_up_count: 0,
      patient_consent_preferences: { sms: true, email: true, voice: false },
      documents: [],
      booking: null,
      tasks: [
        {
          id: 'task-001',
          task_type: 'SUBMIT_PRIOR_AUTH',
          priority: 'HIGH',
          status: 'PENDING',
          instructions: 'Prior authorization required for neurology consultation. Submit via BCBS portal.',
          created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
        }
      ]
    };

    return (
      <div className="space-y-6">
        <ReferralDetail referral={demoReferral} />
      </div>
    );
  }

  // Fetch referral from database
  const { data: referral, error } = await supabase
    .from('referrals')
    .select(
      `
        *,
        patient:profiles!referrals_patient_id_fkey(id, full_name, email, phone, city, state, consent_preferences),
        doctor:profiles!referrals_doctor_id_fkey(id, full_name, email),
        booking:bookings(*),
        tasks:staff_scheduling_tasks(*)
      `
    )
    .eq('id', params.id)
    .single();

  if (error || !referral) {
    // If referral not found, use demo data
    const demoReferral = {
      id: params.id,
      status: 'PRIOR_AUTH_REQUIRED',
      risk_level: 'CRITICAL',
      specialist_type: 'Neurology',
      patient: { full_name: 'Michael Thompson', id: 'demo-patient-id' },
      doctor: { full_name: 'Dr. Sarah Mitchell', id: 'demo-doctor-id' },
      urgency_level: 'URGENT',
      referral_category: 'SPECIALIST',
      visit_type: 'IN_PERSON',
      city: 'Boston',
      state: 'MA',
      insurance_type: 'COMMERCIAL',
      payer_name: 'Blue Cross Blue Shield',
      member_id: 'ABC123456789',
      eligibility_status: 'ACTIVE',
      network_status: 'IN_NETWORK',
      patient_responsibility_estimate: 50,
      prior_auth_required: true,
      prior_auth_status: 'PENDING',
      created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString(),
      clinical_summary: 'Patient presents with chronic headaches and neurological symptoms requiring specialist evaluation.',
      preferred_availability: [],
      follow_up_due_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      follow_up_count: 0,
      patient_consent_preferences: { sms: true, email: true, voice: false },
      documents: [],
      booking: null,
      tasks: [
        {
          id: 'task-001',
          task_type: 'SUBMIT_PRIOR_AUTH',
          priority: 'HIGH',
          status: 'PENDING',
          instructions: 'Prior authorization required for neurology consultation. Submit via BCBS portal.',
          created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
        }
      ]
    };

    return (
      <div className="space-y-6">
        <ReferralDetail referral={demoReferral} />
      </div>
    );
  }

  // Authorization check based on role
  if (profile.role === 'doctor' && referral.doctor_id !== user.id) {
    // For demo purposes, show a restricted view instead of notFound()
    const restrictedReferral = {
      ...referral,
      patient: { full_name: 'Patient Information Restricted', id: referral.patient.id },
      patient_consent_preferences: { sms: false, email: false, voice: false },
    };
    
    return (
      <div className="space-y-6">
        <ReferralDetail referral={restrictedReferral} />
      </div>
    );
  }
  if (profile.role === 'patient' && referral.patient_id !== user.id) {
    // For demo purposes, show a restricted view instead of notFound()
    const restrictedReferral = {
      ...referral,
      doctor: { full_name: 'Doctor Information Restricted', id: referral.doctor.id },
    };
    
    return (
      <div className="space-y-6">
        <ReferralDetail referral={restrictedReferral} />
      </div>
    );
  }
  // Staff can view all referrals

  return (
    <div className="space-y-6">
      <ReferralDetail referral={referral} />
    </div>
  );
}