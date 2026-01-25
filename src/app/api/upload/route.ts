import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { checkRateLimit } from '@/lib/redis';
import {
    extractInsuranceCard,
    detectConflicts,
    getExtractionStatus,
} from '@/services/document_extraction_service';

/**
 * POST /api/upload
 * Upload document (insurance card) and extract data via OCR
 */
export async function POST(request: NextRequest) {
    try {
        const supabase = await createServerSupabaseClient();

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Rate limiting for uploads
        const rateLimit = await checkRateLimit(`upload:${user.id}`, 10, 60000);
        if (!rateLimit.allowed) {
            return NextResponse.json(
                { error: 'Rate limit exceeded' },
                { status: 429 }
            );
        }

        // Parse multipart form data
        const formData = await request.formData();
        const file = formData.get('file') as File | null;
        const referralId = formData.get('referral_id') as string | null;
        const documentType = (formData.get('document_type') as string) || 'INSURANCE_CARD';

        if (!file) {
            return NextResponse.json(
                { error: 'No file provided' },
                { status: 400 }
            );
        }

        if (!referralId) {
            return NextResponse.json(
                { error: 'referral_id is required' },
                { status: 400 }
            );
        }

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json(
                { error: 'Invalid file type. Allowed: JPEG, PNG, WebP, PDF' },
                { status: 400 }
            );
        }

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            return NextResponse.json(
                { error: 'File too large. Maximum size: 10MB' },
                { status: 400 }
            );
        }

        // Fetch referral to verify access
        const { data: referral, error: fetchError } = await supabase
            .from('referrals')
            .select('*')
            .eq('id', referralId)
            .single();

        if (fetchError || !referral) {
            return NextResponse.json(
                { error: 'Referral not found' },
                { status: 404 }
            );
        }

        // Verify user has access
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        const canAccess =
            profile?.role === 'staff' ||
            referral.doctor_id === user.id ||
            referral.patient_id === user.id;

        if (!canAccess) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        // Upload to Supabase Storage
        const fileBuffer = await file.arrayBuffer();
        const fileName = `${referralId}/${Date.now()}_${file.name}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('documents')
            .upload(fileName, fileBuffer, {
                contentType: file.type,
                upsert: false,
            });

        if (uploadError) {
            console.error('Upload error:', uploadError);
            // Continue without storage if bucket doesn't exist (dev mode)
        }

        const fileUrl = uploadData?.path
            ? supabase.storage.from('documents').getPublicUrl(uploadData.path).data.publicUrl
            : null;

        // Update referral status to extraction in progress
        await supabase
            .from('referrals')
            .update({ status: 'EXTRACTION_IN_PROGRESS' })
            .eq('id', referralId);

        // Run OCR extraction for insurance cards
        let extractionResult = null;
        let newStatus = 'DOCUMENTS_RECEIVED';
        let conflicts: ReturnType<typeof detectConflicts> = [];

        if (documentType === 'INSURANCE_CARD' && file.type.startsWith('image/')) {
            try {
                const buffer = Buffer.from(fileBuffer);
                extractionResult = await extractInsuranceCard(buffer);

                // Determine new status based on extraction quality
                newStatus = getExtractionStatus(extractionResult);

                // Check for conflicts with existing data
                const existingData = {
                    member_id: referral.member_id,
                    group_number: referral.group_number,
                    payer_name: referral.payer_name,
                    subscriber_name: null,
                };

                conflicts = detectConflicts(extractionResult.extracted_fields, existingData);

                // If conflicts found, mark as needs review
                if (conflicts.length > 0) {
                    newStatus = 'NEEDS_REVIEW';
                }
            } catch (ocrError) {
                console.error('OCR extraction failed:', ocrError);
                newStatus = 'NEEDS_REVIEW';
            }
        }

        // Build document record
        const documentRecord = {
            type: documentType,
            file_name: file.name,
            file_url: fileUrl,
            file_size: file.size,
            mime_type: file.type,
            uploaded_at: new Date().toISOString(),
            uploaded_by: user.id,
            extraction_result: extractionResult,
        };

        // Update referral with document and extraction results
        const existingDocs = referral.documents || [];
        const updateData: Record<string, unknown> = {
            documents: [...existingDocs, documentRecord],
            status: newStatus,
            last_updated_by: user.id,
        };

        // Update insurance fields if extracted with high confidence
        if (extractionResult && newStatus === 'VERIFIED') {
            const extracted = extractionResult.extracted_fields;
            if (extracted.member_id) updateData.member_id = extracted.member_id;
            if (extracted.group_number) updateData.group_number = extracted.group_number;
            if (extracted.payer_name) updateData.payer_name = extracted.payer_name;
            if (extracted.plan_type) updateData.plan_type = extracted.plan_type;
        }

        // Store conflicts for review
        if (conflicts.length > 0) {
            updateData.extraction_conflicts = conflicts;
        }

        await supabase.from('referrals').update(updateData).eq('id', referralId);

        // If needs review, create staff task
        if (newStatus === 'NEEDS_REVIEW') {
            await supabase.from('staff_scheduling_tasks').insert({
                referral_id: referralId,
                task_type: 'DOCUMENT_REVIEW',
                priority: conflicts.some((c) => c.severity === 'HIGH') ? 'HIGH' : 'MEDIUM',
                status: 'PENDING',
                instructions: conflicts.length > 0
                    ? `Document has ${conflicts.length} conflict(s) requiring review. Please verify extracted data against source document.`
                    : 'Low confidence extraction. Please manually verify insurance information.',
                required_fields: extractionResult?.low_confidence_fields || [],
            });
        }

        // Log metric event
        await supabase.from('referral_metrics').insert({
            referral_id: referralId,
            event_type: 'DOCUMENT_UPLOADED',
            event_data: {
                document_type: documentType,
                ocr_quality: extractionResult?.ocr_quality,
                needs_review: extractionResult?.needs_review,
                conflicts_found: conflicts.length,
            },
            actor_id: user.id,
            actor_role: profile?.role,
        });

        return NextResponse.json({
            success: true,
            data: {
                file_url: fileUrl,
                extraction: extractionResult
                    ? {
                        fields: extractionResult.extracted_fields,
                        confidence_scores: extractionResult.confidence_scores,
                        ocr_quality: extractionResult.ocr_quality,
                        needs_review: extractionResult.needs_review,
                    }
                    : null,
                conflicts,
                new_status: newStatus,
            },
        });
    } catch (error) {
        console.error('Upload error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
