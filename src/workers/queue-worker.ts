// =============================================================================
// NEXUS HEALTH - BullMQ Queue Worker
// Processes background jobs for referral management
// =============================================================================

import { Job } from 'bullmq';
import {
  createWorker,
  QUEUE_NAMES,
  EligibilityCheckJobData,
  StaffSchedulingJobData,
  FollowUpJobData,
  RiskCalculationJobData,
  NotificationJobData,
} from '../lib/queue';
import { createAdminSupabaseClient } from '../lib/supabase-server';
import { checkEligibility } from '../services/insurance_verification_service';
import { calculateRiskScore } from '../services/risk_scoring_service';
import { findEarliestSlot, createBookingData } from '../services/scheduling_agent_service';
import { generatePreventiveMessage, sendSystemMessage } from '../services/chat_service';
import { canSendAutomatedMessage } from '../services/consent_service';

console.log('Starting Nexus Health Queue Worker...');

// =============================================================================
// ELIGIBILITY CHECK WORKER
// =============================================================================
const eligibilityWorker = createWorker({
  name: QUEUE_NAMES.ELIGIBILITY_CHECK,
  processor: async (job: Job<EligibilityCheckJobData>) => {
    console.log(`Processing eligibility check for referral: ${job.data.referral_id}`);

    const { referral_id, payer_id, member_id, insurance_type } = job.data;
    const supabase = createAdminSupabaseClient();

    try {
      // Update status to checking
      await supabase
        .from('referrals')
        .update({ status: 'ELIGIBILITY_CHECKING' })
        .eq('id', referral_id);

      // Perform eligibility check
      const result = await checkEligibility({
        payer_id,
        member_id,
        insurance_type: insurance_type as any,
      });

      // Update referral with results
      await supabase
        .from('referrals')
        .update({
          eligibility_checked_at: new Date().toISOString(),
          eligibility_status: result.status,
          eligibility_response: result as any,
          network_status: result.network_status,
          patient_responsibility_estimate: result.patient_responsibility_estimate,
          prior_auth_required: result.prior_auth_required,
          status: result.coverage_active ? 'ELIGIBILITY_CONFIRMED' : 'ELIGIBILITY_FAILED',
        })
        .eq('id', referral_id);

      // Log metric
      await supabase.from('referral_metrics').insert({
        referral_id,
        event_type: 'ELIGIBILITY_CHECKED',
        event_data: {
          status: result.status,
          network_status: result.network_status,
          prior_auth_required: result.prior_auth_required,
        },
      });

      // If prior auth required, create task
      if (result.prior_auth_required) {
        await supabase
          .from('referrals')
          .update({ status: 'PRIOR_AUTH_REQUIRED' })
          .eq('id', referral_id);

        await supabase.from('staff_scheduling_tasks').insert({
          referral_id,
          task_type: 'SUBMIT_PRIOR_AUTH',
          priority: 'HIGH',
          status: 'PENDING',
          instructions: 'Prior authorization required. Please submit to payer.',
        });
      }

      return { success: true, result };
    } catch (error) {
      console.error('Eligibility check failed:', error);

      await supabase
        .from('referrals')
        .update({
          eligibility_status: 'ERROR',
          status: 'NEEDS_REVIEW',
        })
        .eq('id', referral_id);

      // Create manual review task
      await supabase.from('staff_scheduling_tasks').insert({
        referral_id,
        task_type: 'MANUAL_ELIGIBILITY_CHECK',
        priority: 'HIGH',
        status: 'PENDING',
        instructions: 'Automated eligibility check failed. Please verify manually.',
      });

      throw error;
    }
  },
});

// =============================================================================
// STAFF SCHEDULING WORKER
// =============================================================================
const schedulingWorker = createWorker({
  name: QUEUE_NAMES.STAFF_SCHEDULING,
  processor: async (job: Job<StaffSchedulingJobData>) => {
    console.log(`Processing staff scheduling for referral: ${job.data.referral_id}`);

    const { referral_id, task_id, preferred_availability, specialist_npi } = job.data;
    const supabase = createAdminSupabaseClient();

    try {
      // Get referral and specialist info
      const { data: referral } = await supabase
        .from('referrals')
        .select('*, patient:profiles!referrals_patient_id_fkey(full_name)')
        .eq('id', referral_id)
        .single();

      if (!referral) {
        throw new Error('Referral not found');
      }

      // Get specialist
      const npi = specialist_npi || referral.selected_specialist_npi;
      const { data: specialist } = await supabase
        .from('specialist_cache')
        .select('*')
        .eq('npi', npi)
        .single();

      if (!specialist) {
        throw new Error('Specialist not found');
      }

      // Find earliest slot
      const availability = (preferred_availability || referral.preferred_availability || []) as any[];
      const slot = findEarliestSlot(availability, specialist);

      if (!slot) {
        throw new Error('No available slots found');
      }

      // Create booking
      const bookingData = createBookingData({
        referral_id,
        slot,
        specialist,
        booked_by: 'STAFF',
        visit_type: referral.visit_type,
      });

      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert(bookingData)
        .select()
        .single();

      if (bookingError) {
        throw bookingError;
      }

      // Update referral status
      await supabase
        .from('referrals')
        .update({
          status: 'APPOINTMENT_BOOKED',
          selected_specialist_npi: npi,
        })
        .eq('id', referral_id);

      // Update task as completed
      await supabase
        .from('staff_scheduling_tasks')
        .update({
          status: 'COMPLETED',
          completed_at: new Date().toISOString(),
          completion_notes: `Booked appointment for ${slot.formatted}. Confirmation: ${booking.confirmation_number}`,
        })
        .eq('id', task_id);

      // Send notification message
      await sendSystemMessage(
        referral_id,
        `Great news! Your appointment has been scheduled for ${slot.formatted}. Confirmation #: ${booking.confirmation_number}`,
        { booking_id: booking.id }
      );

      // Log metric
      await supabase.from('referral_metrics').insert({
        referral_id,
        event_type: 'APPOINTMENT_BOOKED',
        event_data: {
          booked_by: 'STAFF',
          confirmation_number: booking.confirmation_number,
        },
      });

      return { success: true, booking };
    } catch (error) {
      console.error('Staff scheduling failed:', error);

      // Update task with failure
      await supabase
        .from('staff_scheduling_tasks')
        .update({
          status: 'PENDING',
          completion_notes: `Auto-booking failed: ${error}. Please book manually.`,
        })
        .eq('id', task_id);

      throw error;
    }
  },
});

// =============================================================================
// FOLLOW-UP WORKER
// =============================================================================
const followUpWorker = createWorker({
  name: QUEUE_NAMES.FOLLOW_UP,
  processor: async (job: Job<FollowUpJobData>) => {
    console.log(`Processing follow-up for referral: ${job.data.referral_id}`);

    const { referral_id, patient_id, doctor_id, follow_up_type } = job.data;
    const supabase = createAdminSupabaseClient();

    try {
      // Get referral
      const { data: referral } = await supabase
        .from('referrals')
        .select('*, patient:profiles!referrals_patient_id_fkey(full_name)')
        .eq('id', referral_id)
        .single();

      if (!referral) {
        throw new Error('Referral not found');
      }

      // Check consent before sending automated message
      const consentResult = await canSendAutomatedMessage(referral_id, 'email');

      if (!consentResult.allowed) {
        console.log(`Consent denied for referral ${referral_id}. Fallback task created.`);
        return { success: true, fallback: true };
      }

      // Generate and send follow-up message
      const patientName = referral.patient?.full_name || 'Patient';
      const message = `Hi ${patientName}, this is a follow-up regarding your ${referral.specialist_type} referral. Have you been able to schedule your appointment yet? Let us know if you need any assistance.`;

      await supabase.from('chat_messages').insert({
        referral_id,
        sender_id: doctor_id,
        sender_role: 'doctor',
        message_text: message,
        message_type: 'TEMPLATE',
        template_id: 'follow_up_reminder',
      });

      // Update referral
      await supabase
        .from('referrals')
        .update({
          last_follow_up_sent_at: new Date().toISOString(),
          follow_up_count: (referral.follow_up_count || 0) + 1,
          status: 'FOLLOW_UP_DUE',
        })
        .eq('id', referral_id);

      // Log metric
      await supabase.from('referral_metrics').insert({
        referral_id,
        event_type: 'FOLLOWUP_SENT',
        event_data: { follow_up_type },
        actor_id: doctor_id,
        actor_role: 'system',
      });

      return { success: true };
    } catch (error) {
      console.error('Follow-up processing failed:', error);
      throw error;
    }
  },
});

// =============================================================================
// RISK CALCULATION WORKER
// =============================================================================
const riskWorker = createWorker({
  name: QUEUE_NAMES.RISK_CALCULATION,
  processor: async (job: Job<RiskCalculationJobData>) => {
    console.log(`Processing risk calculation for referral: ${job.data.referral_id}`);

    const { referral_id } = job.data;
    const supabase = createAdminSupabaseClient();

    try {
      // Get referral with updated_at to implement optimistic locking
      const { data: referral, error } = await supabase
        .from('referrals')
        .select('*, updated_at')
        .eq('id', referral_id)
        .single();

      if (error || !referral) {
        throw new Error(`Referral not found: ${error?.message}`);
      }

      // Calculate risk
      const riskResult = calculateRiskScore(referral);

      // Check if risk escalated
      const riskEscalated =
        riskResult.risk_level !== referral.risk_level &&
        ['HIGH', 'CRITICAL'].includes(riskResult.risk_level);

      // Use optimistic locking to prevent race conditions
      // Only update if the record hasn't been modified since we read it
      const { error: updateError } = await supabase
        .from('referrals')
        .update({
          risk_score: riskResult.risk_score,
          risk_level: riskResult.risk_level,
          risk_factors: riskResult.risk_factors,
          follow_up_due_at: riskResult.follow_up_due_at.toISOString(),
          updated_at: new Date().toISOString(), // Update timestamp to reflect this change
        })
        .eq('id', referral_id)
        .eq('updated_at', referral.updated_at); // Optimistic locking condition

      if (updateError) {
        console.warn(`Risk calculation update failed due to concurrent modification for referral: ${referral_id}`);
        throw new Error(`Concurrent modification detected for referral ${referral_id}. Operation aborted to prevent inconsistent state.`);
      }

      // Log escalation if needed
      if (riskEscalated) {
        await supabase.from('referral_metrics').insert({
          referral_id,
          event_type: 'RISK_ESCALATED',
          event_data: {
            from: referral.risk_level,
            to: riskResult.risk_level,
            recommended_actions: riskResult.recommended_actions,
          },
        });
      }

      return { success: true, riskResult };
    } catch (error) {
      console.error('Risk calculation failed:', error);
      throw error;
    }
  },
});

// =============================================================================
// GRACEFUL SHUTDOWN
// =============================================================================
process.on('SIGTERM', async () => {
  console.log('Received SIGTERM. Shutting down workers...');
  await Promise.all([
    eligibilityWorker.close(),
    schedulingWorker.close(),
    followUpWorker.close(),
    riskWorker.close(),
  ]);
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Received SIGINT. Shutting down workers...');
  await Promise.all([
    eligibilityWorker.close(),
    schedulingWorker.close(),
    followUpWorker.close(),
    riskWorker.close(),
  ]);
  process.exit(0);
});

console.log('Nexus Health Queue Worker started successfully!');
console.log('Listening for jobs on queues:', Object.values(QUEUE_NAMES).join(', '));
