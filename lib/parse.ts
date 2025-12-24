import mammoth from 'mammoth';
import pdf from 'pdf-parse';
import { inspectDocumentText, DocumentAnalysis } from '@/lib/document-analysis';
import { extractTextWithVision, needsOcr, OcrResult } from '@/lib/vision-ocr';

const isDev = process.env.NODE_ENV !== 'production';

export type DocumentMetadata = {
  pageCount?: number;
  rawWordCount: number;
  sanitizedWordCount: number;
  hasImages: boolean;
  wasOcr?: boolean;
  ocrConfidence?: 'high' | 'medium' | 'low';
};

export type ParsedDocument = {
  text: string;
  rawText: string;
  metadata: DocumentMetadata;
  analysis: DocumentAnalysis;
};

type RawParseResult = {
  rawText: string;
  metadata: {
    pageCount?: number;
    rawWordCount: number;
    hasImages: boolean;
  };
};

// Parse DOCX files
export async function parseDocx(buffer: Buffer): Promise<RawParseResult> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    const rawText = result.value;
    const rawWordCount = rawText.split(/\s+/).filter(Boolean).length;

    return {
      rawText,
      metadata: {
        rawWordCount,
        hasImages: false,
      },
    };
  } catch (error) {
    console.error('Error parsing DOCX:', error);
    throw new Error('Failed to parse DOCX file');
  }
}

// Parse PDF files
export async function parsePdf(buffer: Buffer): Promise<RawParseResult> {
  try {
    const data = await pdf(buffer);
    const rawText = data.text;
    const rawWordCount = rawText.split(/\s+/).filter(Boolean).length;

    return {
      rawText,
      metadata: {
        pageCount: data.numpages,
        rawWordCount,
        hasImages: false,
      },
    };
  } catch (error) {
    console.error('Error parsing PDF:', error);
    throw new Error('Failed to parse PDF file');
  }
}

// Main parsing function
export async function parseDocument(
  buffer: Buffer,
  fileType: string,
  fileName?: string
): Promise<ParsedDocument> {
  try {
    let baseResult: RawParseResult;
    let ocrResult: OcrResult | null = null;

    if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      baseResult = await parseDocx(buffer);
    } else if (fileType === 'application/pdf') {
      baseResult = await parsePdf(buffer);

      // Check if PDF needs OCR (scanned/image-based)
      if (needsOcr(baseResult.rawText.length, baseResult.metadata.pageCount)) {
        if (isDev) {
          console.log(`📄 [parseDocument] Low text content detected (${baseResult.rawText.length} chars), attempting Vision OCR...`);
        }

        try {
          ocrResult = await extractTextWithVision(buffer, fileName);

          // Use OCR result if it extracted meaningful text
          if (ocrResult.text.length > baseResult.rawText.length) {
            if (isDev) {
              console.log(`✅ [parseDocument] OCR successful: ${ocrResult.text.length} chars extracted (was ${baseResult.rawText.length})`);
            }
            baseResult = {
              rawText: ocrResult.text,
              metadata: {
                ...baseResult.metadata,
                rawWordCount: ocrResult.text.split(/\s+/).filter(Boolean).length,
                hasImages: true,
              },
            };
          }
        } catch (ocrError: any) {
          // OCR failed, but we can still return what we have
          console.warn(`⚠️ [parseDocument] OCR fallback failed: ${ocrError.message}`);
        }
      }
    } else {
      throw new Error(`Unsupported file type: ${fileType}`);
    }

    const { sanitizedText, analysis } = inspectDocumentText(baseResult.rawText);

    return {
      text: sanitizedText,
      rawText: baseResult.rawText,
      metadata: {
        pageCount: baseResult.metadata.pageCount,
        rawWordCount: baseResult.metadata.rawWordCount,
        sanitizedWordCount: analysis.placeholder.sanitizedWordCount,
        hasImages: baseResult.metadata.hasImages,
        wasOcr: ocrResult?.wasOcr,
        ocrConfidence: ocrResult?.confidence,
      },
      analysis,
    };
  } catch (error) {
    console.error('Error parsing document:', error);
    throw error;
  }
}

// Chunk text for better retrieval
export function chunkText(text: string, maxChunkSize = 500): string[] {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const chunks: string[] = [];
  let currentChunk = '';

  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > maxChunkSize && currentChunk) {
      chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk += sentence;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

