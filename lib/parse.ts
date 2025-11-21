import mammoth from 'mammoth';
import pdf from 'pdf-parse';
import { createWorker } from 'tesseract.js';
import { inspectDocumentText, DocumentAnalysis } from '@/lib/document-analysis';

export type DocumentMetadata = {
  pageCount?: number;
  rawWordCount: number;
  sanitizedWordCount: number;
  hasImages: boolean;
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

// OCR fallback for image-based PDFs or images
export async function performOcr(buffer: Buffer): Promise<string> {
  try {
    const worker = await createWorker('eng');
    const { data } = await worker.recognize(buffer);
    await worker.terminate();
    return data.text;
  } catch (error) {
    console.error('Error performing OCR:', error);
    throw new Error('Failed to perform OCR');
  }
}

// Main parsing function
export async function parseDocument(
  buffer: Buffer,
  fileType: string
): Promise<ParsedDocument> {
  try {
    let baseResult: RawParseResult;

    if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      baseResult = await parseDocx(buffer);
    } else if (fileType === 'application/pdf') {
      baseResult = await parsePdf(buffer);

      // If PDF has very little text, try OCR
      if (baseResult.rawText.length < 100) {
        try {
          const ocrText = await performOcr(buffer);
          if (ocrText.length > baseResult.rawText.length) {
            baseResult = {
              rawText: ocrText,
              metadata: {
                ...baseResult.metadata,
                hasImages: true,
              },
            };
          }
        } catch (ocrError) {
          console.warn('OCR fallback failed:', ocrError);
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

