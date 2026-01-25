'use client';

import { useEffect, useState } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, Clock, ChevronRight, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

interface Conversation {
    referral_id: string;
    other_party_name: string;
    specialist_type: string;
    last_message?: string;
    last_message_at?: string;
    unread_count: number;
    referral_status: string;
}

interface ConversationListProps {
    role: 'doctor' | 'patient' | 'staff';
    userId: string;
}

export function ConversationList({ role, userId }: ConversationListProps) {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const supabase = createBrowserSupabaseClient();

    useEffect(() => {
        async function fetchConversations() {
            try {
                // Fetch referrals for this user
                let query = supabase
                    .from('referrals')
                    .select(`
            id,
            status,
            specialist_type,
            patient:profiles!referrals_patient_id_fkey(full_name),
            doctor:profiles!referrals_doctor_id_fkey(full_name),
            chat_messages(
              message_text,
              created_at,
              is_read,
              sender_id
            )
          `)
                    .order('created_at', { ascending: false });

                if (role === 'patient') {
                    query = query.eq('patient_id', userId);
                } else if (role === 'doctor') {
                    query = query.eq('doctor_id', userId);
                }
                // Staff likely sees all or assigned? For now seeing all to simplify.
                // Or maybe staff shouldn't see patient-doctor chats unless authorized?
                // Assuming staff sees conversations they are involved in or all for MVP.

                const { data: referrals, error } = await query;

                if (error) throw error;

                const processed: Conversation[] = referrals
                    .map((ref) => {
                        const messages = ref.chat_messages || [];
                        // Sort messages to find last one
                        messages.sort((a, b) =>
                            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                        );

                        const lastMsg = messages[0];
                        const unreadCount = messages.filter(
                            (m) => !m.is_read && m.sender_id !== userId
                        ).length;

                        const getFullName = (profile: any) => {
                            if (Array.isArray(profile)) return profile[0]?.full_name;
                            return profile?.full_name;
                        };

                        const otherName =
                            role === 'patient'
                                ? getFullName(ref.doctor) || 'Doctor'
                                : getFullName(ref.patient) || 'Patient';

                        return {
                            referral_id: ref.id,
                            other_party_name: otherName,
                            specialist_type: ref.specialist_type,
                            last_message: lastMsg?.message_text,
                            last_message_at: lastMsg?.created_at,
                            unread_count: unreadCount,
                            referral_status: ref.status,
                        };
                    })
                    // Filter out referrals with no messages unless it's a new referral?
                    // Let's show all for now, but maybe prioritize ones with messages
                    .sort((a, b) => {
                        // Unread first
                        if (a.unread_count > 0 && b.unread_count === 0) return -1;
                        if (b.unread_count > 0 && a.unread_count === 0) return 1;

                        // Then recent message
                        if (a.last_message_at && b.last_message_at) {
                            return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime();
                        }
                        return 0;
                    });

                setConversations(processed);
            } catch (error) {
                console.error('Error fetching conversations:', error);
            } finally {
                setIsLoading(false);
            }
        }

        fetchConversations();

        // Subscribe to new messages
        const channel = supabase
            .channel('public:chat_messages')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'chat_messages',
                },
                () => {
                    fetchConversations();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [userId, role, supabase]);

    if (isLoading) {
        return (
            <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-24 w-full rounded-xl" />
                ))}
            </div>
        );
    }

    if (conversations.length === 0) {
        return (
            <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-2xl">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">No messages yet</h3>
                <p className="text-gray-500">
                    Conversations will appear here when you or your doctor send a message.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {conversations.map((conv) => (
                <Link
                    key={conv.referral_id}
                    href={`/referrals/${conv.referral_id}`}
                    className="block group"
                >
                    <Card className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-transparent hover:border-l-blue-500">
                        <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                                <div className="flex items-start gap-4">
                                    <Avatar className="w-12 h-12">
                                        <AvatarFallback className="bg-blue-100 text-blue-600">
                                            {conv.other_party_name.substring(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>

                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-semibold text-gray-900 dark:text-white">
                                                {conv.other_party_name}
                                            </h3>
                                            <Badge variant="outline" className="text-xs">
                                                {conv.specialist_type}
                                            </Badge>
                                            {conv.unread_count > 0 && (
                                                <Badge className="bg-blue-500 text-white hover:bg-blue-600">
                                                    {conv.unread_count} new
                                                </Badge>
                                            )}
                                        </div>

                                        <p className="text-sm font-medium text-gray-900 dark:text-gray-300 mt-1 line-clamp-1">
                                            {conv.last_message || 'Start a conversation'}
                                        </p>

                                        <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                                            {conv.last_message_at && (
                                                <span className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: true })}
                                                </span>
                                            )}
                                            <span>
                                                Status: {conv.referral_status}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
                            </div>
                        </CardContent>
                    </Card>
                </Link>
            ))}
        </div>
    );
}
