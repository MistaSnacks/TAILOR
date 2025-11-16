import mammoth from 'mammoth';
import pdf from 'pdf-parse';
import { createWorker } from 'tesseract.js';

export type ParsedDocument = {
  text: string;
  metadata: {
    pageCount?: number;
    wordCount: number;
    hasImages: boolean;
  };
};

// Parse DOCX files
export async function parseDocx(buffer: Buffer): Promise<ParsedDocument> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    const text = result.value;
    const wordCount = text.split(/\s+/).filter(Boolean).length;

    return {
      text,
      metadata: {
        wordCount,
        hasImages: false,
      },
    };
  } catch (error) {
    console.error('Error parsing DOCX:', error);
    throw new Error('Failed to parse DOCX file');
  }
}

// Parse PDF files
export async function parsePdf(buffer: Buffer): Promise<ParsedDocument> {
  try {
    const data = await pdf(buffer);
    const text = data.text;
    const wordCount = text.split(/\s+/).filter(Boolean).length;

    return {
      text,
      metadata: {
        pageCount: data.numpages,
        wordCount,
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
    if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      return await parseDocx(buffer);
    } else if (fileType === 'application/pdf') {
      const result = await parsePdf(buffer);
      
      // If PDF has very little text, try OCR
      if (result.text.length < 100) {
        try {
          const ocrText = await performOcr(buffer);
          if (ocrText.length > result.text.length) {
            return {
              text: ocrText,
              metadata: {
                ...result.metadata,
                hasImages: true,
              },
            };
          }
        } catch (ocrError) {
          console.warn('OCR fallback failed:', ocrError);
        }
      }
      
      return result;
    } else {
      throw new Error(`Unsupported file type: ${fileType}`);
    }
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

