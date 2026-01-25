import { ConversationList } from '@/components/chat/ConversationList';

export default async function PatientMessagesPage() {
    // DEMO MODE: Hardcoded patient ID (Jane Doe)
    const user = { id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Messages</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Chat with your care team
                    </p>
                </div>
            </div>

            <ConversationList role="patient" userId={user.id} />
        </div>
    );
}
