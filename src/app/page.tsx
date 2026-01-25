'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UserCircle, Users, Stethoscope, ArrowRight, Shield } from 'lucide-react';

export default function DemoLandingPage() {
  const router = useRouter();

  const roles = [
    {
      title: 'Doctor Dashboard',
      description: 'View referrals, manage patients, and track metrics',
      icon: Stethoscope,
      path: '/dashboard',
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-500',
    },
    {
      title: 'Staff Queue',
      description: 'Process tasks, validate documents, and handle prior auth',
      icon: Users,
      path: '/queue',
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-500',
    },
    {
      title: 'Patient Portal',
      description: 'View your referrals, messages, and appointments',
      icon: UserCircle,
      path: '/home',
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-500',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 mb-6 shadow-lg">
            <Shield className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Refree
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto mb-2">
            Referral + Intake Automation Platform
          </p>
          <p className="text-gray-500 dark:text-gray-400">
            Select a role to explore the demo
          </p>
        </div>

        {/* Role Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-16">
          {roles.map((role) => (
            <Card
              key={role.path}
              className="group hover:shadow-2xl transition-all duration-300 cursor-pointer border-2 hover:border-blue-400 overflow-hidden"
              onClick={() => router.push(role.path)}
            >
              <div className={`h-2 bg-gradient-to-r ${role.color}`} />
              <CardHeader className="pt-8">
                <div className={`w-16 h-16 rounded-2xl ${role.bgColor} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg`}>
                  <role.icon className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-2xl">{role.title}</CardTitle>
                <CardDescription className="text-base">{role.description}</CardDescription>
              </CardHeader>
              <CardContent className="pb-8">
                <Button className={`w-full group bg-gradient-to-r ${role.color} hover:opacity-90 text-white`}>
                  Enter Dashboard
                  <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Features Grid */}
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8 text-gray-800 dark:text-white">
            Platform Features
          </h2>
          <div className="grid md:grid-cols-3 gap-6 text-sm">
            <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Stethoscope className="w-4 h-4 text-blue-500" />
                  Doctor Features
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-gray-600 dark:text-gray-300">
                <p>• Active referrals overview</p>
                <p>• Risk-based prioritization</p>
                <p>• Real-time dashboard metrics</p>
                <p>• Create new referrals</p>
                <p>• Patient chat messaging</p>
              </CardContent>
            </Card>

            <Card className="bg-green-50 dark:bg-green-950/30 border-green-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="w-4 h-4 text-green-500" />
                  Staff Features
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-gray-600 dark:text-gray-300">
                <p>• Task queue management</p>
                <p>• Prior authorization processing</p>
                <p>• Document validation</p>
                <p>• SLA tracking</p>
                <p>• Manual override controls</p>
              </CardContent>
            </Card>

            <Card className="bg-purple-50 dark:bg-purple-950/30 border-purple-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <UserCircle className="w-4 h-4 text-purple-500" />
                  Patient Features
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-gray-600 dark:text-gray-300">
                <p>• Referral status tracking</p>
                <p>• Specialist recommendations</p>
                <p>• Appointment booking</p>
                <p>• Secure messaging</p>
                <p>• Document uploads</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
