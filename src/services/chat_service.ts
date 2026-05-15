// =============================================================================
// NEXUS HEALTH - Chat Service
// Real-time messaging and template handling
// =============================================================================

import { ChatMessage, MessageTemplate, SendMessageRequest } from '@/types';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// =============================================================================
// MESSAGE TEMPLATES
// =============================================================================

/**
 * Interpolate variables in a template
 */
export function interpolateTemplate(
  template: string,
  variables: Record<string, string>
): string {
  let result = template;

  for (const [key, value] of Object.entries(variables)) {
    const pattern = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(pattern, value);
  }

  return result;
}

/**
 * Get available message templates
 */
export async function getMessageTemplates(
  category?: string
): Promise<MessageTemplate[]> {
  const supabase = await createServerSupabaseClient();

  let query = supabase.from('message_templates').select('*');

  if (category) {
    query = query.eq('category', category);
  }

  const { data, error } = await query.order('name');

  if (error) {
    console.error('Error fetching templates:', error);
    throw new Error('Failed to fetch message templates');
  }

  return data as MessageTemplate[];
}

// =============================================================================
// MESSAGE OPERATIONS
// =============================================================================

/**
 * Send a message for a referral
 */
export async function sendMessage(
  request: SendMessageRequest,
  senderId: string,
  senderRole: string
): Promise<ChatMessage> {
  const supabase = await createServerSupabaseClient();

  // If using a template, get and interpolate it
  let messageText = request.message_text;
  let messageType = request.message_type || 'TEXT';

  if (request.template_id) {
    const { data: template, error: templateError } = await supabase
      .from('message_templates')
      .select('*')
      .eq('id', request.template_id)
      .single();

    if (templateError) {
      throw new Error('Template not found');
    }

    // Template variables should be passed in message_text as JSON
    try {
      const variables = JSON.parse(request.message_text);
      messageText = interpolateTemplate(template.template_text, variables);
      messageType = 'TEMPLATE';
    } catch {
      // If not JSON, use as-is
      messageText = request.message_text;
    }
  }

  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      referral_id: request.referral_id,
      sender_id: senderId,
      sender_role: senderRole,
      message_text: messageText,
      message_type: messageType,
      template_id: request.template_id,
      attachments: request.attachments || [],
    })
    .select()
    .single();

  if (error) {
    console.error('Error sending message:', error);
    throw new Error('Failed to send message');
  }

  // Record metric
  await supabase.from('referral_metrics').insert({
    referral_id: request.referral_id,
    event_type: 'MESSAGE_SENT',
    event_data: { message_type: messageType },
    actor_id: senderId,
    actor_role: senderRole,
  });

  return data as ChatMessage;
}

/**
 * Get messages for a referral
 */
export async function getMessages(
  referralId: string,
  limit: number = 50,
  offset: number = 0
): Promise<ChatMessage[]> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from('chat_messages')
    .select(`
      *,
      sender:profiles(id, full_name, role)
    `)
    .eq('referral_id', referralId)
    .order('created_at', { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Error fetching messages:', error);
    throw new Error('Failed to fetch messages');
  }

  return data as ChatMessage[];
}

/**
 * Mark messages as read
 */
export async function markMessagesAsRead(
  referralId: string,
  userId: string
): Promise<void> {
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase
    .from('chat_messages')
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
    })
    .eq('referral_id', referralId)
    .neq('sender_id', userId)
    .eq('is_read', false);

  if (error) {
    console.error('Error marking messages as read:', error);
  }
}

/**
 * Get unread message count for a user
 */
export async function getUnreadCount(
  userId: string,
  role: string
): Promise<number> {
  const supabase = await createServerSupabaseClient();

  // Get referrals the user has access to
  let referralQuery = supabase.from('referrals').select('id');

  if (role === 'doctor') {
    referralQuery = referralQuery.eq('doctor_id', userId);
  } else if (role === 'patient') {
    referralQuery = referralQuery.eq('patient_id', userId);
  }

  const { data: referrals } = await referralQuery;
  const referralIds = referrals?.map((r) => r.id) || [];

  if (referralIds.length === 0) {
    return 0;
  }

  const { count, error } = await supabase
    .from('chat_messages')
    .select('*', { count: 'exact', head: true })
    .in('referral_id', referralIds)
    .neq('sender_id', userId)
    .eq('is_read', false);

  if (error) {
    console.error('Error getting unread count:', error);
    return 0;
  }

  return count || 0;
}

// =============================================================================
// AI-GENERATED MESSAGES
// =============================================================================

/**
 * Generate a preventive follow-up message using OpenAI
 */
export async function generatePreventiveMessage(
  patientName: string,
  specialistType: string,
  clinicalSummary?: string,
  visitType?: string
): Promise<string> {
  // Check if DeepSeek is configured
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    // Return a default message if AI is not configured
    console.warn('DEEPSEEK_API_KEY not found, skipping AI generation');
    return getDefaultPreventiveMessage(patientName, specialistType);
  }

  try {
    // Initialize OpenAI client with DeepSeek configuration
    const { default: OpenAI } = await import('openai');
    const openai = new OpenAI({
      apiKey,
      baseURL: 'https://api.deepseek.com'
    });

    const prompt = `Generate a short, caring preventive follow-up message for a patient named ${patientName} who has a pending referral to ${specialistType}.

Context:
- The patient reported their symptoms have improved
- They have NOT yet scheduled their appointment
- Visit type: ${visitType || 'in-person'}
${clinicalSummary ? `- Clinical context: ${clinicalSummary}` : ''}

Requirements:
- Keep the message to 2-3 sentences
- Be encouraging and supportive
- Explain why completing the specialist visit is important for preventive care
- Do NOT provide any medical diagnosis or advice
- End with offering help to schedule

Generate the message:`;

    const response = await openai.chat.completions.create({
      model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful healthcare coordination assistant. Your role is to encourage patients to complete their specialist visits for preventive care. Never provide medical advice or diagnoses.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 200,
      temperature: 0.7,
    });

    return response.choices[0]?.message?.content || getDefaultPreventiveMessage(patientName, specialistType);
  } catch (error) {
    console.error('Error generating AI message:', error);
    return getDefaultPreventiveMessage(patientName, specialistType);
  }
}

function getDefaultPreventiveMessage(patientName: string, specialistType: string): string {
  return `Hi ${patientName}, we're glad your symptoms have improved! However, it's still important to complete your ${specialistType} visit to ensure comprehensive care and catch any underlying issues early. Would you like help scheduling your appointment?`;
}

// =============================================================================
// SYSTEM MESSAGES
// =============================================================================

/**
 * Send a system notification message
 */
export async function sendSystemMessage(
  referralId: string,
  message: string,
  contextData?: Record<string, unknown>
): Promise<void> {
  const supabase = await createServerSupabaseClient();

  await supabase.from('chat_messages').insert({
    referral_id: referralId,
    sender_id: '00000000-0000-0000-0000-000000000000', // System user
    sender_role: 'system',
    message_text: message,
    message_type: 'SYSTEM',
    context_data: contextData,
  });
}
