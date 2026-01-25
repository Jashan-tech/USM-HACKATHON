'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    ZoomIn,
    ZoomOut,
    RotateCw,
    AlertTriangle,
    CheckCircle,
    AlertCircle,
    FileText,
    Save,
} from 'lucide-react';

interface ExtractionField {
    field_name: string;
    label: string;
    extracted_value: string;
    existing_value?: string;
    confidence: number;
    has_conflict: boolean;
}

interface SplitScreenValidationProps {
    documentUrl: string;
    documentType: string;
    fields: ExtractionField[];
    onSave: (
        verifiedData: Record<string, string>,
        manualOverride?: ManualOverrideData
    ) => Promise<void>;
    onCancel: () => void;
}

interface ManualOverrideData {
    verification_method: 'PHONE' | 'PAYER_PORTAL' | 'FAX' | 'OTHER';
    verification_reference: string;
    verification_agent_name?: string;
    verification_notes: string;
}

export function SplitScreenValidation({
    documentUrl,
    documentType,
    fields,
    onSave,
    onCancel,
}: SplitScreenValidationProps) {
    const [zoom, setZoom] = useState(100);
    const [rotation, setRotation] = useState(0);
    const [editedFields, setEditedFields] = useState<Record<string, string>>(
        fields.reduce((acc, field) => {
            acc[field.field_name] = field.extracted_value || '';
            return acc;
        }, {} as Record<string, string>)
    );
    const [activeField, setActiveField] = useState<string | null>(null);
    const [manualMode, setManualMode] = useState(false);
    const [manualData, setManualData] = useState<Partial<ManualOverrideData>>({});
    const [isSaving, setIsSaving] = useState(false);

    // Get confidence color and icon
    function getConfidenceDisplay(confidence: number) {
        if (confidence >= 0.85) {
            return {
                color: 'text-green-600 bg-green-100',
                icon: CheckCircle,
                label: 'High',
            };
        } else if (confidence >= 0.7) {
            return {
                color: 'text-yellow-600 bg-yellow-100',
                icon: AlertCircle,
                label: 'Medium',
            };
        } else {
            return {
                color: 'text-red-600 bg-red-100',
                icon: AlertTriangle,
                label: 'Low',
            };
        }
    }

    async function handleSave() {
        setIsSaving(true);
        try {
            const manualOverride = manualMode
                ? ({
                    verification_method: manualData.verification_method || 'OTHER',
                    verification_reference: manualData.verification_reference || '',
                    verification_agent_name: manualData.verification_agent_name,
                    verification_notes: manualData.verification_notes || '',
                } as ManualOverrideData)
                : undefined;

            await onSave(editedFields, manualOverride);
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 border-b">
                <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-blue-500" />
                    <h2 className="font-semibold text-gray-900 dark:text-white">
                        Document Review
                    </h2>
                    <Badge variant="secondary">{documentType}</Badge>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={onCancel}>
                        Cancel
                    </Button>
                    <Button size="sm" onClick={handleSave} disabled={isSaving}>
                        <Save className="w-4 h-4 mr-1" />
                        {isSaving ? 'Saving...' : 'Save & Verify'}
                    </Button>
                </div>
            </div>

            {/* Main content - Split screen */}
            <div className="flex flex-1 overflow-hidden">
                {/* Left panel - Document viewer */}
                <div className="w-1/2 flex flex-col border-r">
                    {/* Toolbar */}
                    <div className="flex items-center justify-center gap-2 p-2 bg-white dark:bg-gray-800 border-b">
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setZoom((z) => Math.max(50, z - 25))}
                        >
                            <ZoomOut className="w-4 h-4" />
                        </Button>
                        <span className="text-sm text-gray-500 w-16 text-center">{zoom}%</span>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setZoom((z) => Math.min(200, z + 25))}
                        >
                            <ZoomIn className="w-4 h-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setRotation((r) => (r + 90) % 360)}
                        >
                            <RotateCw className="w-4 h-4" />
                        </Button>
                    </div>

                    {/* Document image */}
                    <div className="flex-1 overflow-auto p-4 bg-gray-100 dark:bg-gray-900">
                        <div
                            className="flex items-center justify-center min-h-full"
                            style={{
                                transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                                transformOrigin: 'center',
                            }}
                        >
                            {documentUrl ? (
                                <Image
                                    src={documentUrl}
                                    alt="Document"
                                    width={600}
                                    height={400}
                                    className="max-w-full rounded-lg shadow-lg"
                                    style={{ objectFit: 'contain' }}
                                />
                            ) : (
                                <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                                    <FileText className="w-16 h-16 mb-4" />
                                    <p>No document preview available</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right panel - Data form */}
                <div className="w-1/2 flex flex-col overflow-auto">
                    <div className="p-4 space-y-4">
                        {/* Manual Override Toggle */}
                        <Card className="rounded-2xl bg-blue-50 dark:bg-blue-900/20 border-blue-200">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="font-medium text-gray-900 dark:text-white">
                                            Manual Entry Mode
                                        </h3>
                                        <p className="text-sm text-gray-500">
                                            Toggle to enter verification details manually
                                        </p>
                                    </div>
                                    <Switch checked={manualMode} onCheckedChange={setManualMode} />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Manual override fields */}
                        {manualMode && (
                            <Card className="rounded-2xl">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm">Manual Verification Details</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div>
                                        <Label>Verification Method</Label>
                                        <Select
                                            value={manualData.verification_method}
                                            onValueChange={(v) =>
                                                setManualData({ ...manualData, verification_method: v as ManualOverrideData['verification_method'] })
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select method" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="PHONE">Phone</SelectItem>
                                                <SelectItem value="PAYER_PORTAL">Payer Portal</SelectItem>
                                                <SelectItem value="FAX">Fax</SelectItem>
                                                <SelectItem value="OTHER">Other</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <Label>Reference Number</Label>
                                        <Input
                                            value={manualData.verification_reference || ''}
                                            onChange={(e) =>
                                                setManualData({ ...manualData, verification_reference: e.target.value })
                                            }
                                            placeholder="Confirmation or reference number"
                                        />
                                    </div>
                                    {manualData.verification_method === 'PHONE' && (
                                        <div>
                                            <Label>Agent Name</Label>
                                            <Input
                                                value={manualData.verification_agent_name || ''}
                                                onChange={(e) =>
                                                    setManualData({ ...manualData, verification_agent_name: e.target.value })
                                                }
                                                placeholder="Name of representative"
                                            />
                                        </div>
                                    )}
                                    <div>
                                        <Label>Verification Notes</Label>
                                        <Textarea
                                            value={manualData.verification_notes || ''}
                                            onChange={(e) =>
                                                setManualData({ ...manualData, verification_notes: e.target.value })
                                            }
                                            placeholder="Additional notes about verification"
                                            rows={2}
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Extracted fields */}
                        <Card className="rounded-2xl">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm">Extracted Data</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {fields.map((field) => {
                                    const confidence = getConfidenceDisplay(field.confidence);
                                    const ConfidenceIcon = confidence.icon;
                                    const isActive = activeField === field.field_name;

                                    return (
                                        <div
                                            key={field.field_name}
                                            className={`rounded-lg p-3 transition-all ${isActive
                                                    ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                                    : 'bg-gray-50 dark:bg-gray-800'
                                                }`}
                                            onClick={() => setActiveField(field.field_name)}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <Label className="text-sm font-medium">{field.label}</Label>
                                                <Badge className={`text-xs ${confidence.color}`}>
                                                    <ConfidenceIcon className="w-3 h-3 mr-1" />
                                                    {Math.round(field.confidence * 100)}%
                                                </Badge>
                                            </div>

                                            <Input
                                                value={editedFields[field.field_name] || ''}
                                                onChange={(e) =>
                                                    setEditedFields({
                                                        ...editedFields,
                                                        [field.field_name]: e.target.value,
                                                    })
                                                }
                                                className="mb-2"
                                            />

                                            {/* Conflict warning */}
                                            {field.has_conflict && field.existing_value && (
                                                <div className="flex items-start gap-2 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
                                                    <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                                                    <div className="text-xs">
                                                        <p className="font-medium text-red-700 dark:text-red-400">
                                                            Conflict Detected
                                                        </p>
                                                        <p className="text-red-600 dark:text-red-300">
                                                            Existing: <span className="font-mono">{field.existing_value}</span>
                                                        </p>
                                                        <p className="text-red-600 dark:text-red-300">
                                                            Extracted: <span className="font-mono">{field.extracted_value}</span>
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
