'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, Mail, Shield, Smartphone } from 'lucide-react';

interface ProfileSectionProps {
    user: {
        email?: string;
        full_name?: string;
        role?: string;
    };
}

export function ProfileSection({ user }: ProfileSectionProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>
                    Your personal account details
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex items-center gap-4">
                    <Avatar className="w-20 h-20">
                        <AvatarFallback className="text-xl bg-blue-100 text-blue-600">
                            {user.full_name?.substring(0, 2).toUpperCase() || 'US'}
                        </AvatarFallback>
                    </Avatar>
                    <div>
                        <h3 className="font-semibold text-lg">{user.full_name || 'User'}</h3>
                        <p className="text-sm text-gray-500 capitalize">{user.role} Account</p>
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                        <Label htmlFor="fullName">Full Name</Label>
                        <div className="relative">
                            <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                            <Input
                                id="fullName"
                                defaultValue={user.full_name}
                                className="pl-9"
                                readOnly
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                            <Input
                                id="email"
                                defaultValue={user.email}
                                className="pl-9"
                                readOnly
                            />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end">
                    <Button variant="outline" disabled>
                        Edit Profile (Contact Support)
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
