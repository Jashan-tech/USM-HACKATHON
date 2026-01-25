'use client';

import { useEffect, useRef, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Send,
    MessageSquare,
    FileText,
    Bot,
    User,
    Stethoscope,
    HeadphonesIcon,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ChatMessage {
    id: string;
    referral_id: string;
    sender_id: string;
    sender_role: 'doctor' | 'patient' | 'staff' | 'system';
    message_text: string;
    message_type: 'TEXT' | 'TEMPLATE' | 'AI_GENERATED' | 'SYSTEM' | 'ATTACHMENT';
    template_id?: string;
    attachments?: unknown[];
    is_read: boolean;
    created_at: string;
}

interface MessageTemplate {
    id: string;
    name: string;
    category: string;
    template_text: string;
    variables: string[];
}

interface ChatInterfaceProps {
    referralId: string;
    currentUserId: string;
    currentUserRole: 'doctor' | 'patient' | 'staff';
    patientName?: string;
    doctorName?: string;
    specialistType?: string;
}

export function ChatInterface({
    referralId,
    currentUserId,
    currentUserRole,
    patientName = 'Patient',
    doctorName = 'Doctor',
    specialistType = 'Specialist',
}: ChatInterfaceProps) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [templates, setTemplates] = useState<MessageTemplate[]>([]);
    const scrollRef = useRef<HTMLDivElement>(null);

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Fetch initial messages
    useEffect(() => {
        async function fetchMessages() {
            setIsLoading(true);
            try {
                const response = await fetch(`/api/chat/${referralId}`);
                if (response.ok) {
                    const data = await response.json();
                    setMessages(data.data || []);
                }
            } catch (error) {
                console.error('Failed to fetch messages:', error);
            } finally {
                setIsLoading(false);
            }
        }

        async function fetchTemplates() {
            const { data } = await supabase
                .from('message_templates')
                .select('*')
                .order('category');
            setTemplates(data || []);
        }

        fetchMessages();
        fetchTemplates();
    }, [referralId, supabase]);

    // Subscribe to real-time messages
    useEffect(() => {
        const channel = supabase
            .channel(`chat:${referralId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'chat_messages',
                    filter: `referral_id=eq.${referralId}`,
                },
                (payload) => {
                    const newMsg = payload.new as ChatMessage;
                    setMessages((prev) => {
                        // Avoid duplicates
                        if (prev.some((m) => m.id === newMsg.id)) return prev;
                        return [...prev, newMsg];
                    });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [referralId, supabase]);

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    // Mark messages as read when viewed
    useEffect(() => {
        const unreadIds = messages
            .filter((m) => !m.is_read && m.sender_id !== currentUserId)
            .map((m) => m.id);

        if (unreadIds.length > 0) {
            supabase
                .from('chat_messages')
                .update({ is_read: true, read_at: new Date().toISOString() })
                .in('id', unreadIds)
                .then(() => { });
        }
    }, [messages, currentUserId, supabase]);

    // Send message
    async function handleSend() {
        if (!newMessage.trim() || isSending) return;

        setIsSending(true);
        try {
            const response = await fetch(`/api/chat/${referralId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message_text: newMessage,
                    message_type: 'TEXT',
                }),
            });

            if (response.ok) {
                setNewMessage('');
            }
        } catch (error) {
            console.error('Failed to send message:', error);
        } finally {
            setIsSending(false);
        }
    }

    // Use template
    function handleTemplateSelect(template: MessageTemplate) {
        // Replace variables in template
        let text = template.template_text;
        text = text.replace(/\{\{patient_name\}\}/g, patientName);
        text = text.replace(/\{\{doctor_name\}\}/g, doctorName);
        text = text.replace(/\{\{specialist_type\}\}/g, specialistType);
        text = text.replace(/\{\{specialist_name\}\}/g, specialistType);
        setNewMessage(text);
    }

    // Get sender display info
    function getSenderInfo(message: ChatMessage) {
        switch (message.sender_role) {
            case 'doctor':
                return {
                    name: message.sender_id === currentUserId ? 'You' : doctorName,
                    icon: Stethoscope,
                    color: 'text-blue-600',
                    bgColor: 'bg-blue-100',
                };
            case 'patient':
                return {
                    name: message.sender_id === currentUserId ? 'You' : patientName,
                    icon: User,
                    color: 'text-green-600',
                    bgColor: 'bg-green-100',
                };
            case 'staff':
                return {
                    name: 'Staff',
                    icon: HeadphonesIcon,
                    color: 'text-purple-600',
                    bgColor: 'bg-purple-100',
                };
            case 'system':
                return {
                    name: 'System',
                    icon: Bot,
                    color: 'text-gray-600',
                    bgColor: 'bg-gray-100',
                };
            default:
                return {
                    name: 'Unknown',
                    icon: MessageSquare,
                    color: 'text-gray-600',
                    bgColor: 'bg-gray-100',
                };
        }
    }

    return (
        <div className="flex flex-col h-full border rounded-2xl bg-white dark:bg-gray-800 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50 dark:bg-gray-900">
                <div className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-blue-500" />
                    <h3 className="font-semibold text-gray-900 dark:text-white">Messages</h3>
                    {messages.length > 0 && (
                        <Badge variant="secondary" className="text-xs">
                            {messages.length}
                        </Badge>
                    )}
                </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                {isLoading ? (
                    <div className="flex items-center justify-center h-32">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500" />
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 text-gray-500">
                        <MessageSquare className="w-8 h-8 mb-2 opacity-50" />
                        <p className="text-sm">No messages yet</p>
                        <p className="text-xs mt-1">Start the conversation</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {messages.map((message) => {
                            const sender = getSenderInfo(message);
                            const isOwn = message.sender_id === currentUserId;
                            const Icon = sender.icon;

                            return (
                                <div
                                    key={message.id}
                                    className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : ''}`}
                                >
                                    <div
                                        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${sender.bgColor}`}
                                    >
                                        <Icon className={`w-4 h-4 ${sender.color}`} />
                                    </div>
                                    <div className={`flex-1 max-w-[75%] ${isOwn ? 'text-right' : ''}`}>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                                {sender.name}
                                            </span>
                                            <span className="text-xs text-gray-400">
                                                {formatDistanceToNow(new Date(message.created_at), {
                                                    addSuffix: true,
                                                })}
                                            </span>
                                            {message.message_type === 'AI_GENERATED' && (
                                                <Badge variant="outline" className="text-xs py-0">
                                                    AI
                                                </Badge>
                                            )}
                                        </div>
                                        <div
                                            className={`inline-block px-4 py-2 rounded-2xl ${isOwn
                                                    ? 'bg-blue-500 text-white'
                                                    : message.sender_role === 'system'
                                                        ? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 italic'
                                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                                                }`}
                                        >
                                            <p className="text-sm whitespace-pre-wrap">{message.message_text}</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </ScrollArea>

            {/* Input */}
            <div className="p-4 border-t bg-gray-50 dark:bg-gray-900">
                <div className="flex items-center gap-2">
                    {/* Template selector */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="icon" className="shrink-0">
                                <FileText className="w-4 h-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-64">
                            {templates.map((template) => (
                                <DropdownMenuItem
                                    key={template.id}
                                    onClick={() => handleTemplateSelect(template)}
                                    className="flex flex-col items-start"
                                >
                                    <span className="font-medium">{template.name}</span>
                                    <span className="text-xs text-gray-500">{template.category}</span>
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Message input */}
                    <Input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                    />

                    {/* Send button */}
                    <Button onClick={handleSend} disabled={!newMessage.trim() || isSending}>
                        <Send className="w-4 h-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
