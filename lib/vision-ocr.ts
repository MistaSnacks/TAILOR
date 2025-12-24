/**
 * Vision OCR Module
 * Uses Gemini's multimodal capabilities to extract text from scanned/image-based PDFs
 */

import { genAI } from './gemini';

const isDev = process.env.NODE_ENV !== 'production';

export type OcrResult = {
  text: string;
  confidence: 'high' | 'medium' | 'low';
  pageCount?: number;
  wasOcr: true;
};

/**
 * Extract text from a PDF using Gemini Vision
 * This is used as a fallback when pdf-parse returns little/no text (scanned documents)
 */
export async function extractTextWithVision(
  pdfBuffer: Buffer,
  fileName?: string
): Promise<OcrResult> {
  if (!genAI) {
    throw new Error('Gemini API key not configured - cannot perform OCR');
  }

  const startTime = Date.now();
  if (isDev) console.log(`🔍 [Vision OCR] Starting OCR for ${fileName || 'document'}...`);

  // Use gemini-2.0-flash for vision tasks (fast + capable)
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
  });

  // Convert PDF buffer to base64 for inline data
  const base64Data = pdfBuffer.toString('base64');

  const prompt = `You are a precise document OCR system. Extract ALL text content from this PDF document.

CRITICAL INSTRUCTIONS:
1. Extract every piece of text visible in the document, preserving the structure
2. Maintain paragraph breaks and logical sections
3. For forms/tables, preserve the field labels and their values on the same line
4. For military documents (like DD214), extract all fields including:
   - Service member information (name, SSN - last 4 only, dates)
   - Military service details (branch, rank, MOS/specialty codes)
   - Decorations, medals, badges, citations
   - Character of service, discharge type
   - Any remarks or additional information
5. Do NOT interpret or summarize - just extract the raw text as accurately as possible
6. If text is unclear or partially visible, include it with [unclear] notation
7. Preserve dates, numbers, and codes exactly as they appear

OUTPUT FORMAT:
- Return ONLY the extracted text
- Use line breaks to separate logical sections
- Do not add any commentary, headers, or metadata about your extraction process`;

  try {
    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: 'application/pdf',
          data: base64Data,
        },
      },
      { text: prompt },
    ]);

    const response = result.response;
    const extractedText = response.text();

    const duration = Date.now() - startTime;
    const wordCount = extractedText.split(/\s+/).filter(Boolean).length;

    if (isDev) {
      console.log(`✅ [Vision OCR] Completed in ${duration}ms`, {
        wordCount,
        textLength: extractedText.length,
        fileName: fileName || 'document',
      });
    }

    // Determine confidence based on extracted content
    let confidence: 'high' | 'medium' | 'low' = 'high';
    if (extractedText.includes('[unclear]')) {
      confidence = 'medium';
    }
    if (wordCount < 50) {
      confidence = 'low';
    }

    return {
      text: extractedText,
      confidence,
      wasOcr: true,
    };
  } catch (error: any) {
    console.error('❌ [Vision OCR] Failed:', {
      error: error.message,
      fileName: fileName || 'document',
    });

    // Check for specific error types
    if (error.message?.includes('SAFETY')) {
      throw new Error('Document was blocked by safety filters. Please ensure the document contains appropriate content.');
    }
    if (error.message?.includes('too large') || error.message?.includes('size')) {
      throw new Error('Document is too large for OCR processing. Please try a smaller file or split into multiple documents.');
    }

    throw new Error(`OCR extraction failed: ${error.message}`);
  }
}

/**
 * Check if a PDF likely needs OCR based on initial text extraction results
 */
export function needsOcr(rawTextLength: number, pageCount?: number): boolean {
  // If we got basically no text, definitely needs OCR
  if (rawTextLength < 50) {
    return true;
  }

  // If we have page count, check text-per-page ratio
  // A typical text PDF has 300+ words per page, scanned might have <10
  if (pageCount && pageCount > 0) {
    const textPerPage = rawTextLength / pageCount;
    // Less than 100 chars per page suggests scanned/image content
    if (textPerPage < 100) {
      return true;
    }
  }

  return false;
}

