import { ConversationList } from '@/components/chat/ConversationList';

export default async function DoctorMessagesPage() {
    // DEMO MODE: Hardcoded doctor ID
    const user = { id: '11111111-1111-1111-1111-111111111111' };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Messages</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Communication with your patients
                    </p>
                </div>
            </div>

            <ConversationList role="doctor" userId={user.id} />
        </div>
    );
}
