// =============================================================================
// NEXUS HEALTH - Consent Service
// HIPAA-compliant consent tracking and verification
// =============================================================================

import { ConsentPreferences, Referral } from '@/types';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// =============================================================================
// CONSENT TYPES
// =============================================================================

export type CommunicationChannel = 'sms' | 'email' | 'voice';

export interface ConsentCheckResult {
  allowed: boolean;
  channel: CommunicationChannel;
  consent_given: boolean;
  fallback_action?: string;
}

export interface ConsentAuditEntry {
  referral_id: string;
  channel: CommunicationChannel;
  action: 'CHECK' | 'ALLOWED' | 'DENIED' | 'FALLBACK_CREATED';
  result: boolean;
  fallback_task_id?: string;
  timestamp: string;
}

// =============================================================================
// CONSENT VERIFICATION
// =============================================================================

/**
 * Check if automated communication is allowed for a specific channel
 * CRITICAL: This function MUST be called before any automated outreach
 */
export async function canSendAutomatedMessage(
  referralId: string,
  channel: CommunicationChannel
): Promise<ConsentCheckResult> {
  const supabase = await createServerSupabaseClient();

  // Get referral with consent preferences
  const { data: referral, error } = await supabase
    .from('referrals')
    .select('patient_consent_preferences, patient_id')
    .eq('id', referralId)
    .single();

  if (error || !referral) {
    // Default to denied if referral not found
    await logConsentCheck(referralId, channel, false, 'REFERRAL_NOT_FOUND');
    return {
      allowed: false,
      channel,
      consent_given: false,
      fallback_action: 'MANUAL_OUTREACH_REQUIRED',
    };
  }

  const consent = referral.patient_consent_preferences as ConsentPreferences;

  // Check if patient has consented to this channel
  if (!consent || !consent[channel]) {
    // Log the denied consent check
    await logConsentCheck(referralId, channel, false, 'NO_CONSENT');

    // Create manual fallback task
    const taskId = await createManualOutreachTask(
      referralId,
      channel,
      referral.patient_id
    );

    return {
      allowed: false,
      channel,
      consent_given: false,
      fallback_action: `MANUAL_TASK_CREATED:${taskId}`,
    };
  }

  // Consent is valid
  await logConsentCheck(referralId, channel, true, 'CONSENT_VALID');

  return {
    allowed: true,
    channel,
    consent_given: true,
  };
}

/**
 * Create a manual outreach task when automated communication is not allowed
 */
async function createManualOutreachTask(
  referralId: string,
  deniedChannel: CommunicationChannel,
  patientId: string
): Promise<string> {
  const supabase = await createServerSupabaseClient();

  const channelName = deniedChannel.toUpperCase();

  const { data: task, error } = await supabase
    .from('staff_scheduling_tasks')
    .insert({
      referral_id: referralId,
      task_type: 'MANUAL_PATIENT_OUTREACH',
      priority: 'HIGH',
      status: 'PENDING',
      instructions: `Patient has not consented to automated ${channelName} messages. Please call patient manually to follow up on referral.`,
      required_actions: [
        'Call patient directly',
        'Document conversation',
        'Update referral status',
        `Do not use automated ${channelName}`,
      ],
    })
    .select('id')
    .single();

  if (error) {
    console.error('Failed to create manual outreach task:', error);
    return 'TASK_CREATION_FAILED';
  }

  // Log the fallback action
  await supabase.from('referral_metrics').insert({
    referral_id: referralId,
    event_type: 'CONSENT_UPDATED',
    event_data: {
      action: 'FALLBACK_TASK_CREATED',
      channel: deniedChannel,
      task_id: task.id,
    },
  });

  return task.id;
}

/**
 * Log consent check for audit trail
 */
async function logConsentCheck(
  referralId: string,
  channel: CommunicationChannel,
  allowed: boolean,
  reason: string
): Promise<void> {
  const supabase = await createServerSupabaseClient();

  await supabase.from('audit_log').insert({
    table_name: 'consent_checks',
    record_id: referralId,
    action: 'INSERT',
    new_values: {
      channel,
      allowed,
      reason,
      checked_at: new Date().toISOString(),
    },
  });
}

// =============================================================================
// CONSENT MANAGEMENT
// =============================================================================

/**
 * Update patient consent preferences
 */
export async function updateConsentPreferences(
  referralId: string,
  preferences: Partial<ConsentPreferences>,
  updatedBy: string
): Promise<ConsentPreferences> {
  const supabase = await createServerSupabaseClient();

  // Get current preferences
  const { data: referral } = await supabase
    .from('referrals')
    .select('patient_consent_preferences')
    .eq('id', referralId)
    .single();

  const currentPreferences = (referral?.patient_consent_preferences || {
    sms: false,
    email: false,
    voice: false,
  }) as ConsentPreferences;

  // Merge with updates
  const newPreferences: ConsentPreferences = {
    ...currentPreferences,
    ...preferences,
  };

  // Update referral
  const { error } = await supabase
    .from('referrals')
    .update({
      patient_consent_preferences: newPreferences,
      last_updated_by: updatedBy,
    })
    .eq('id', referralId);

  if (error) {
    throw new Error('Failed to update consent preferences');
  }

  // Log the update
  await supabase.from('referral_metrics').insert({
    referral_id: referralId,
    event_type: 'CONSENT_UPDATED',
    event_data: {
      previous: currentPreferences,
      new: newPreferences,
    },
    actor_id: updatedBy,
  });

  return newPreferences;
}

/**
 * Get consent status display for UI
 */
export function getConsentStatusDisplay(preferences: ConsentPreferences): {
  sms: { consented: boolean; label: string };
  email: { consented: boolean; label: string };
  voice: { consented: boolean; label: string };
} {
  return {
    sms: {
      consented: preferences.sms,
      label: preferences.sms ? 'SMS Consented' : 'SMS Not Consented',
    },
    email: {
      consented: preferences.email,
      label: preferences.email ? 'Email Consented' : 'Email Not Consented',
    },
    voice: {
      consented: preferences.voice,
      label: preferences.voice ? 'Voice Consented' : 'Voice Not Consented',
    },
  };
}

// =============================================================================
// BULK CONSENT OPERATIONS
// =============================================================================

/**
 * Check consent for multiple channels
 */
export async function checkMultiChannelConsent(
  referralId: string,
  channels: CommunicationChannel[]
): Promise<Record<CommunicationChannel, ConsentCheckResult>> {
  const results: Record<CommunicationChannel, ConsentCheckResult> = {} as Record<
    CommunicationChannel,
    ConsentCheckResult
  >;

  for (const channel of channels) {
    results[channel] = await canSendAutomatedMessage(referralId, channel);
  }

  return results;
}

/**
 * Get best available communication channel
 * Returns the first consented channel in order of preference
 */
export async function getBestAvailableChannel(
  referralId: string,
  preferredOrder: CommunicationChannel[] = ['sms', 'email', 'voice']
): Promise<CommunicationChannel | null> {
  for (const channel of preferredOrder) {
    const result = await canSendAutomatedMessage(referralId, channel);
    if (result.allowed) {
      return channel;
    }
  }
  return null;
}
