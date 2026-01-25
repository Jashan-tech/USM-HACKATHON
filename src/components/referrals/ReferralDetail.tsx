'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  User, 
  Stethoscope, 
  CreditCard, 
  Calendar, 
  MapPin, 
  Clock, 
  AlertTriangle, 
  FileText, 
  MessageSquare,
  Phone,
  Mail,
  CheckCircle,
  XCircle,
  Loader2
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { STATUS_CONFIG, RISK_CONFIG } from '@/lib/utils';
import { ReferralStatus, RiskLevel } from '@/types';

interface ReferralDetailProps {
  referral: any; // Using any for demo data structure
}

export function ReferralDetail({ referral }: ReferralDetailProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(false);

  const statusConfig = STATUS_CONFIG[referral.status as ReferralStatus] || { label: referral.status, color: 'text-gray-600', bgColor: 'bg-gray-100' };
  const riskConfig = RISK_CONFIG[referral.risk_level as RiskLevel] || { label: referral.risk_level, color: 'text-gray-600', bgColor: 'bg-gray-100' };

  const handleUpdateStatus = async (newStatus: string) => {
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      // In real implementation, this would update the referral status
    }, 1000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {referral.specialist_type} Referral
            </h1>
            <Badge className={riskConfig.bgColor + ' ' + riskConfig.color}>
              {referral.risk_level}
            </Badge>
          </div>
          <p className="text-gray-500 dark:text-gray-400">
            ID: {referral.id} • Created {formatDistanceToNow(new Date(referral.created_at), { addSuffix: true })}
          </p>
        </div>
        
        <div className="flex gap-2">
          <Badge variant="outline" className={statusConfig.bgColor + ' ' + statusConfig.color}>
            {statusConfig.label}
          </Badge>
          
          {referral.urgency_level === 'STAT' && (
            <Badge variant="destructive">STAT</Badge>
          )}
          {referral.urgency_level === 'URGENT' && (
            <Badge variant="warning" className="bg-orange-100 text-orange-700">URGENT</Badge>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="rounded-2xl">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{referral.patient?.full_name || 'N/A'}</div>
            <div className="text-sm text-gray-500">Patient</div>
          </CardContent>
        </Card>
        
        <Card className="rounded-2xl">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{referral.payer_name || 'N/A'}</div>
            <div className="text-sm text-gray-500">Insurance</div>
          </CardContent>
        </Card>
        
        <Card className="rounded-2xl">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-amber-600">{referral.eligibility_status || 'N/A'}</div>
            <div className="text-sm text-gray-500">Eligibility</div>
          </CardContent>
        </Card>
        
        <Card className="rounded-2xl">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{referral.follow_up_count || 0}</div>
            <div className="text-sm text-gray-500">Follow-ups</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="patient">Patient</TabsTrigger>
          <TabsTrigger value="insurance">Insurance</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Clinical Summary */}
              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-500" />
                    Clinical Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 dark:text-gray-300">
                    {referral.clinical_summary || 'No clinical summary provided.'}
                  </p>
                </CardContent>
              </Card>

              {/* Status & Actions */}
              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle>Status & Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                    <div>
                      <div className="font-medium">Current Status</div>
                      <div className="text-sm text-gray-500">{statusConfig.label}</div>
                    </div>
                    <Badge className={statusConfig.bgColor + ' ' + statusConfig.color}>
                      {referral.status}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {referral.status !== 'APPOINTMENT_BOOKED' && (
                      <Button variant="default">
                        <Calendar className="w-4 h-4 mr-2" />
                        Schedule Appointment
                      </Button>
                    )}
                    
                    {referral.status === 'NEEDS_REVIEW' && (
                      <Button variant="outline" onClick={() => handleUpdateStatus('VERIFIED')}>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Verify Details
                      </Button>
                    )}
                    
                    {referral.status === 'PRIOR_AUTH_REQUIRED' && (
                      <Button variant="outline" onClick={() => handleUpdateStatus('PRIOR_AUTH_SUBMITTED')}>
                        <FileText className="w-4 h-4 mr-2" />
                        Submit Prior Auth
                      </Button>
                    )}
                    
                    <Button variant="outline">
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Message Patient
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Patient Info */}
              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5 text-blue-500" />
                    Patient
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="font-medium text-gray-900 dark:text-white">
                    {referral.patient?.full_name || 'N/A'}
                  </p>
                  
                  {referral.patient?.phone && (
                    <a
                      href={`tel:${referral.patient.phone}`}
                      className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                    >
                      <Phone className="w-4 h-4" />
                      {referral.patient.phone}
                    </a>
                  )}
                  
                  {referral.patient?.email && (
                    <a
                      href={`mailto:${referral.patient.email}`}
                      className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                    >
                      <Mail className="w-4 h-4" />
                      {referral.patient.email}
                    </a>
                  )}
                  
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <MapPin className="w-4 h-4" />
                    {referral.city}, {referral.state}
                  </div>
                </CardContent>
              </Card>

              {/* Insurance Info */}
              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-green-500" />
                    Insurance
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <div className="text-sm text-gray-500">Payer</div>
                    <div className="font-medium">{referral.payer_name || 'N/A'}</div>
                  </div>
                  
                  <div>
                    <div className="text-sm text-gray-500">Member ID</div>
                    <div className="font-mono">{referral.member_id || 'N/A'}</div>
                  </div>
                  
                  <div>
                    <div className="text-sm text-gray-500">Eligibility</div>
                    <div className={`font-medium ${
                      referral.eligibility_status === 'ACTIVE' 
                        ? 'text-green-600' 
                        : referral.eligibility_status === 'INACTIVE' 
                          ? 'text-red-600' 
                          : 'text-gray-600'
                    }`}>
                      {referral.eligibility_status || 'N/A'}
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-sm text-gray-500">Est. Patient Responsibility</div>
                    <div className="font-medium">
                      ${referral.patient_responsibility_estimate?.toFixed(2) || '0.00'}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Risk & Follow-up */}
              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                    Risk & Follow-up
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <div className="text-sm text-gray-500">Risk Level</div>
                    <div className="font-medium">
                      <Badge className={riskConfig.bgColor + ' ' + riskConfig.color}>
                        {referral.risk_level}
                      </Badge>
                    </div>
                  </div>
                  
                  {referral.follow_up_due_at && (
                    <div>
                      <div className="text-sm text-gray-500">Next Follow-up</div>
                      <div className="font-medium">
                        {format(new Date(referral.follow_up_due_at), 'MMM d, yyyy h:mm a')}
                      </div>
                    </div>
                  )}
                  
                  <div>
                    <div className="text-sm text-gray-500">Follow-ups Sent</div>
                    <div className="font-medium">{referral.follow_up_count || 0}</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="patient" className="space-y-6">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>Patient Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-2">Personal Details</h4>
                  <dl className="space-y-2">
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Name</dt>
                      <dd className="font-medium">{referral.patient?.full_name || 'N/A'}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Phone</dt>
                      <dd className="font-medium">{referral.patient?.phone || 'N/A'}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Email</dt>
                      <dd className="font-medium">{referral.patient?.email || 'N/A'}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Location</dt>
                      <dd className="font-medium">{referral.city}, {referral.state}</dd>
                    </div>
                  </dl>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Consent Preferences</h4>
                  <dl className="space-y-2">
                    <div className="flex justify-between">
                      <dt className="text-gray-500">SMS</dt>
                      <dd className="font-medium">
                        {referral.patient_consent_preferences?.sms ? 'Allowed' : 'Denied'}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Email</dt>
                      <dd className="font-medium">
                        {referral.patient_consent_preferences?.email ? 'Allowed' : 'Denied'}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Voice</dt>
                      <dd className="font-medium">
                        {referral.patient_consent_preferences?.voice ? 'Allowed' : 'Denied'}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insurance" className="space-y-6">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>Insurance Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-2">Primary Insurance</h4>
                  <dl className="space-y-2">
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Payer Name</dt>
                      <dd className="font-medium">{referral.payer_name || 'N/A'}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Member ID</dt>
                      <dd className="font-mono">{referral.member_id || 'N/A'}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Group Number</dt>
                      <dd className="font-mono">{referral.group_number || 'N/A'}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Plan Type</dt>
                      <dd className="font-medium">{referral.plan_type || 'N/A'}</dd>
                    </div>
                  </dl>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Coverage</h4>
                  <dl className="space-y-2">
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Eligibility Status</dt>
                      <dd className={`font-medium ${
                        referral.eligibility_status === 'ACTIVE' 
                          ? 'text-green-600' 
                          : referral.eligibility_status === 'INACTIVE' 
                            ? 'text-red-600' 
                            : 'text-gray-600'
                      }`}>
                        {referral.eligibility_status || 'N/A'}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Network Status</dt>
                      <dd className="font-medium">{referral.network_status || 'N/A'}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Patient Responsibility</dt>
                      <dd className="font-medium">
                        ${referral.patient_responsibility_estimate?.toFixed(2) || '0.00'}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Prior Auth Required</dt>
                      <dd className="font-medium">
                        {referral.prior_auth_required ? 'Yes' : 'No'}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeline" className="space-y-6">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>Activity Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <div className="w-0.5 h-full bg-gray-200 mt-1"></div>
                  </div>
                  <div className="pb-4">
                    <p className="font-medium">Referral Created</p>
                    <p className="text-sm text-gray-500">
                      {format(new Date(referral.created_at), 'MMM d, yyyy h:mm a')} • 
                      By {referral.doctor?.full_name || 'Doctor'}
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <div className="w-0.5 h-full bg-gray-200 mt-1"></div>
                  </div>
                  <div className="pb-4">
                    <p className="font-medium">Status Updated</p>
                    <p className="text-sm text-gray-500">
                      {format(new Date(referral.updated_at), 'MMM d, yyyy h:mm a')} • 
                      {statusConfig.label}
                    </p>
                  </div>
                </div>
                
                {referral.tasks && referral.tasks.length > 0 && referral.tasks.map((task: any, index: number) => (
                  <div key={index} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      {index < referral.tasks.length - 1 && (
                        <div className="w-0.5 h-full bg-gray-200 mt-1"></div>
                      )}
                    </div>
                    <div className="pb-4">
                      <p className="font-medium">{TASK_TYPE_LABELS[task.task_type] || task.task_type}</p>
                      <p className="text-sm text-gray-500">
                        {format(new Date(task.created_at), 'MMM d, yyyy h:mm a')} • 
                        Priority: {task.priority}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

const TASK_TYPE_LABELS: Record<string, string> = {
  MANUAL_SCHEDULING: 'Manual Scheduling',
  MANUAL_ELIGIBILITY_CHECK: 'Eligibility Check',
  SUBMIT_PRIOR_AUTH: 'Prior Authorization',
  DOCUMENT_REVIEW: 'Document Review',
  CONFLICT_RESOLUTION: 'Conflict Resolution',
  HOSPICE_URGENT_INTAKE: 'Hospice Intake (URGENT)',
  MANUAL_PATIENT_OUTREACH: 'Patient Outreach',
  INSURANCE_VERIFICATION: 'Insurance Verification',
  GENERAL: 'General Task',
};