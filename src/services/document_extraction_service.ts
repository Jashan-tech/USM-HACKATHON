// =============================================================================
// REFREE - Document Extraction Service
// OCR and data extraction from insurance cards and documents
// =============================================================================

import { InsuranceCardExtraction, OCRExtractionResult, ExtractionConflict } from '@/types';

// Confidence threshold for auto-verification
const HIGH_CONFIDENCE_THRESHOLD = 0.85;
const MEDIUM_CONFIDENCE_THRESHOLD = 0.70;

// =============================================================================
// OCR EXTRACTION (using Tesseract.js)
// =============================================================================

/**
 * Extract text from an image using Tesseract.js
 */
export async function extractTextFromImage(imageBuffer: Buffer): Promise<{
  text: string;
  confidence: number;
}> {
  try {
    const Tesseract = await import('tesseract.js');

    const { data } = await Tesseract.recognize(imageBuffer, 'eng', {
      logger: () => { }, // Suppress logs
    });

    return {
      text: data.text,
      confidence: data.confidence / 100, // Convert to 0-1 range
    };
  } catch (error) {
    console.error('OCR extraction failed:', error);
    throw new Error('Failed to extract text from image');
  }
}

// =============================================================================
// INSURANCE CARD EXTRACTION
// =============================================================================

// Common patterns for insurance card data
const PATTERNS = {
  member_id: [
    /member\s*(?:id|#|number)?[:\s]*([A-Z0-9\-]{6,20})/i,
    /id[:\s]*([A-Z0-9\-]{6,20})/i,
    /subscriber\s*(?:id|#)?[:\s]*([A-Z0-9\-]{6,20})/i,
  ],
  group_number: [
    /group\s*(?:#|number)?[:\s]*([A-Z0-9\-]{3,15})/i,
    /grp[:\s]*([A-Z0-9\-]{3,15})/i,
    /plan\s*#[:\s]*([A-Z0-9\-]{3,15})/i,
  ],
  payer_name: [
    /^(aetna|cigna|united\s*healthcare|blue\s*cross|humana|anthem|kaiser|molina|centene)/im,
    /(aetna|cigna|uhc|bcbs|humana|anthem|kaiser)/i,
  ],
  plan_type: [
    /\b(hmo|ppo|epo|pos|medicaid|medicare)\b/i,
  ],
  copay: [
    /(?:office\s*visit|pcp|specialist)\s*(?:copay)?[:\s]*\$?(\d+)/i,
    /copay[:\s]*\$?(\d+)/i,
  ],
  effective_date: [
    /eff(?:ective)?[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
    /coverage\s*begins?[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
  ],
  subscriber_name: [
    /subscriber[:\s]*([A-Z][a-z]+\s+[A-Z][a-z]+)/i,
    /member\s*name[:\s]*([A-Z][a-z]+\s+[A-Z][a-z]+)/i,
  ],
};

/**
 * Extract insurance card data from OCR text
 */
export function extractInsuranceCardData(
  ocrText: string,
  baseConfidence: number
): InsuranceCardExtraction {
  const result: InsuranceCardExtraction = {
    confidence_scores: {},
  };

  // Extract each field
  for (const [field, patterns] of Object.entries(PATTERNS)) {
    for (const pattern of patterns) {
      const match = ocrText.match(pattern);
      if (match) {
        const value = match[1] || match[0];
        const fieldName = field as keyof InsuranceCardExtraction;

        if (fieldName !== 'confidence_scores') {
          (result as unknown as Record<string, unknown>)[fieldName] = value.trim();
        }

        // Calculate confidence based on pattern match quality
        const patternConfidence = calculatePatternConfidence(match, pattern, ocrText);
        result.confidence_scores[field] = Math.round(baseConfidence * patternConfidence * 100) / 100;
        break;
      }
    }
  }

  return result;
}

/**
 * Calculate confidence score for a pattern match
 */
function calculatePatternConfidence(
  match: RegExpMatchArray,
  pattern: RegExp,
  fullText: string
): number {
  let confidence = 0.7; // Base confidence for any match

  // Boost if match is longer (more specific)
  if (match[0].length > 10) confidence += 0.1;

  // Boost if pattern has clear field label
  if (/member|group|subscriber/i.test(pattern.source)) confidence += 0.1;

  // Penalize if text quality is poor (lots of special characters)
  const noiseRatio = (fullText.match(/[^a-zA-Z0-9\s]/g) || []).length / fullText.length;
  if (noiseRatio > 0.2) confidence -= 0.15;

  return Math.max(0.3, Math.min(1, confidence));
}

// =============================================================================
// MAIN EXTRACTION FUNCTION
// =============================================================================

/**
 * Extract data from an insurance card image
 */
export async function extractInsuranceCard(
  imageBuffer: Buffer
): Promise<OCRExtractionResult> {
  // Run OCR
  const { text, confidence } = await extractTextFromImage(imageBuffer);

  // Extract structured data
  const extraction = extractInsuranceCardData(text, confidence);

  // Determine OCR quality
  let ocrQuality: 'GOOD' | 'FAIR' | 'POOR' = 'GOOD';
  if (confidence < 0.6) ocrQuality = 'POOR';
  else if (confidence < 0.8) ocrQuality = 'FAIR';

  // Find low confidence fields
  const lowConfidenceFields = Object.entries(extraction.confidence_scores)
    .filter(([_, score]) => score < MEDIUM_CONFIDENCE_THRESHOLD)
    .map(([field]) => field);

  // Determine if manual review is needed
  const needsReview =
    ocrQuality === 'POOR' ||
    lowConfidenceFields.length > 2 ||
    !extraction.member_id ||
    !extraction.payer_name;

  // Convert to generic format
  const extractedFields: Record<string, string> = {};
  for (const [key, value] of Object.entries(extraction)) {
    if (key !== 'confidence_scores' && value) {
      extractedFields[key] = value as string;
    }
  }

  return {
    extracted_fields: extractedFields,
    confidence_scores: extraction.confidence_scores,
    low_confidence_fields: lowConfidenceFields,
    ocr_quality: ocrQuality,
    needs_review: needsReview,
  };
}

// =============================================================================
// CONFLICT DETECTION
// =============================================================================

/**
 * Detect conflicts between extracted data and existing referral data
 */
export function detectConflicts(
  extracted: Record<string, string>,
  existing: Record<string, string | null>
): ExtractionConflict[] {
  const conflicts: ExtractionConflict[] = [];

  // Fields to check for conflicts
  const fieldsToCheck = ['member_id', 'group_number', 'payer_name', 'subscriber_name'];

  for (const field of fieldsToCheck) {
    const extractedValue = extracted[field];
    const existingValue = existing[field];

    if (extractedValue && existingValue && extractedValue !== existingValue) {
      // Determine severity
      let severity: 'LOW' | 'MEDIUM' | 'HIGH' = 'MEDIUM';

      // High severity for key identifiers
      if (field === 'member_id') {
        severity = 'HIGH';
      }
      // Low severity for minor name variations
      if (field === 'payer_name' &&
        normalizePayerName(extractedValue) === normalizePayerName(existingValue)) {
        continue; // Skip if names are equivalent
      }

      conflicts.push({
        field,
        source_1: { type: 'EXISTING_DATA', value: existingValue },
        source_2: { type: 'EXTRACTED', value: extractedValue },
        severity,
      });
    }
  }

  return conflicts;
}

/**
 * Normalize payer name for comparison
 */
function normalizePayerName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/blue\s*cross\s*blue\s*shield/i, 'bcbs')
    .replace(/united\s*healthcare/i, 'uhc');
}

// =============================================================================
// AUTO-VERIFICATION
// =============================================================================

/**
 * Determine if extracted data should be auto-verified
 */
export function shouldAutoVerify(result: OCRExtractionResult): boolean {
  // All fields must have high confidence
  const allHighConfidence = Object.values(result.confidence_scores).every(
    (score) => score >= HIGH_CONFIDENCE_THRESHOLD
  );

  // Must have required fields
  const hasRequiredFields = Boolean(
    result.extracted_fields.member_id &&
    result.extracted_fields.payer_name
  );

  return allHighConfidence && hasRequiredFields && result.ocr_quality === 'GOOD';
}

/**
 * Get extraction status based on results
 */
export function getExtractionStatus(result: OCRExtractionResult): string {
  if (shouldAutoVerify(result)) {
    return 'VERIFIED';
  } else if (result.needs_review) {
    return 'NEEDS_REVIEW';
  } else {
    return 'DOCUMENTS_RECEIVED';
  }
}
