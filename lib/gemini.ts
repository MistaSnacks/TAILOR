import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server';
import { logSecretUsage } from './env-logger';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';

// Log Gemini API key status (REMOVE IN PRODUCTION)
logSecretUsage('GEMINI_API_KEY', !!apiKey);

export const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null as any;
export const fileManager = apiKey ? new GoogleAIFileManager(apiKey) : null as any;

export type GeminiFileReference = {
  uri: string;
  mimeType: string;
};

function buildFileParts(references: GeminiFileReference[] = []) {
  return references
    .filter(ref => ref.uri)
    .map(ref => ({
      fileData: {
        fileUri: ref.uri,
        mimeType: ref.mimeType,
      },
    }));
}

// Create or update a user's File Search store
export async function createOrUpdateFileSearchStore(
  userId: string,
  displayName?: string
): Promise<string> {
  try {
    // For now, we'll use the Files API to upload files
    // and then reference them in generation requests
    // The actual File Search store creation will be done when uploading files
    const storeName = `user-${userId}-resume-store`;
    return storeName;
  } catch (error) {
    console.error('Error creating File Search store:', error);
    throw error;
  }
}

// Upload a file buffer to Gemini Files API
export async function uploadFileToGemini(
  buffer: Buffer,
  mimeType: string,
  displayName: string
): Promise<{ uri: string; name: string }> {
  try {
    if (!fileManager) {
      throw new Error('Gemini API key not configured');
    }

    console.log('📤 Uploading file to Gemini:', displayName);

    // Create a temporary file
    const tempFilePath = join(tmpdir(), `upload-${Date.now()}-${displayName}`);
    writeFileSync(tempFilePath, buffer);

    try {
      // Upload to Gemini Files API
      const uploadResult = await fileManager.uploadFile(tempFilePath, {
        mimeType,
        displayName,
      });

      console.log('✅ File uploaded to Gemini:', {
        name: uploadResult.file.name,
        uri: uploadResult.file.uri,
        mimeType: uploadResult.file.mimeType,
      });

      return {
        uri: uploadResult.file.uri,
        name: uploadResult.file.name,
      };
    } finally {
      // Clean up temporary file
      try {
        unlinkSync(tempFilePath);
      } catch (e) {
        console.warn('Failed to delete temp file:', e);
      }
    }
  } catch (error) {
    console.error('❌ Error uploading file to Gemini:', error);
    throw error;
  }
}

// Upload plain text chunk content to Gemini
export async function uploadTextChunkToGemini(
  content: string,
  displayName: string
): Promise<{ uri: string; name: string; mimeType: string }> {
  const buffer = Buffer.from(content, 'utf-8');
  const upload = await uploadFileToGemini(buffer, 'text/plain', displayName);
  return { ...upload, mimeType: 'text/plain' };
}

// Generate embeddings for semantic search / chunk ranking
export async function embedText(text: string): Promise<number[]> {
  if (!genAI) {
    throw new Error('Gemini API key not configured');
  }

  const embedModel = genAI.getGenerativeModel({ model: 'text-embedding-004' });
  const result = await embedModel.embedContent(text);
  const embedding = result.embedding?.values;

  if (!embedding || embedding.length === 0) {
    throw new Error('Failed to generate embedding');
  }

  return embedding;
}

// Generate tailored resume using File Search
export type ChunkContext = {
  documentFiles?: GeminiFileReference[];
  parsedDocuments?: string[];
  chunkTexts?: string[];
  chunkFileReferences?: GeminiFileReference[];
};

export async function generateTailoredResume(
  jobDescription: string,
  template: string,
  context: ChunkContext = {}
): Promise<string> {
  try {
    if (!genAI) {
      throw new Error('Gemini API key not configured');
    }

    const {
      documentFiles = [],
      parsedDocuments = [],
      chunkTexts = [],
      chunkFileReferences = [],
    } = context;

    console.log('⚡ Generating tailored resume:', {
      hasJobDescription: !!jobDescription,
      fileCount: documentFiles.length,
      chunkFileCount: chunkFileReferences.length,
      chunkTextCount: chunkTexts.length,
      template,
      hasParsedDocs: parsedDocuments.length > 0,
    });

    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash-exp',
    });

    // Build context from parsed documents if available
    let documentContext = '';
    if (parsedDocuments && parsedDocuments.length > 0) {
      documentContext += '\n\nUser\'s Resume Content:\n' + parsedDocuments.join('\n\n---\n\n');
    }

    if (chunkTexts && chunkTexts.length > 0) {
      documentContext += '\n\nMost Relevant Resume Chunks:\n' + chunkTexts
        .map((chunk, idx) => `Chunk ${idx + 1}:\n${chunk}`)
        .join('\n\n---\n\n');
    }

    const prompt = `You are an expert resume writer and ATS optimization specialist.

Job Description:
${jobDescription}
${documentContext}

Task: Create a tailored, ATS-optimized resume based on the user's documents and the job description above.

Requirements:
1. Use ONLY information from the provided documents - never fabricate experience
2. Prioritize relevant experience and skills that match the job description
3. Use strong action verbs and quantify achievements where possible
4. Optimize for ATS by including relevant keywords naturally
5. Format using the ${template} template style
6. Keep bullet points concise (1-2 lines each)
7. Ensure all dates, companies, and roles are accurate from source documents

Structure:
- Professional Summary (2-3 sentences tailored to the role)
- Work Experience (most relevant positions, tailored bullets)
- Skills (matching job requirements)
- Education
- Certifications (if relevant)

Return the resume in a structured JSON format with sections like:
{
  "summary": "...",
  "experience": [...],
  "skills": [...],
  "education": [...],
  "certifications": [...]
}`;

    const parts: any[] = [{ text: prompt }];

    // Attach chunk-level file references first (already processed text)
    if (chunkFileReferences.length > 0) {
      parts.push(...buildFileParts(chunkFileReferences));
    }

    // Attach full document references as a fallback
    if (documentFiles.length > 0) {
      parts.push(...buildFileParts(documentFiles));
    }

    const result = await model.generateContent({
      contents: [{ role: 'user', parts }],
    });

    const response = result.response.text();
    console.log('✅ Resume generated successfully');
    return response;
  } catch (error) {
    console.error('❌ Error generating tailored resume:', error);
    throw error;
  }
}

// Chat with documents using Gemini
export async function chatWithDocuments(
  message: string,
  conversationHistory: Array<{ role: string; content: string }>,
  context: ChunkContext = {}
): Promise<string> {
  try {
    const {
      documentFiles = [],
      chunkTexts = [],
      chunkFileReferences = [],
    } = context;

    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash-exp',
    });

    const chat = model.startChat({
      history: conversationHistory.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }],
      })),
    });

    const contextPrefix = chunkTexts.length
      ? `Use the following resume excerpts to ground your answer:\n${chunkTexts
          .map((chunk, idx) => `Chunk ${idx + 1}:\n${chunk}`)
          .join('\n\n---\n\n')}\n\nUser question: ${message}`
      : message;

    const parts: any[] = [{ text: contextPrefix }];

    if (chunkFileReferences.length > 0) {
      parts.push(...buildFileParts(chunkFileReferences));
    }

    if (documentFiles.length > 0) {
      parts.push(...buildFileParts(documentFiles));
    }

    const result = await chat.sendMessage(parts);
    return result.response.text();
  } catch (error) {
    console.error('Error chatting with documents:', error);
    throw error;
  }
}

// Calculate ATS score
export async function calculateAtsScore(
  jobDescription: string,
  resumeContent: string
): Promise<{
  score: number;
  keywordMatch: number;
  semanticSimilarity: number;
  analysis: any;
}> {
  try {
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash-exp',
    });

    const prompt = `Analyze this resume against the job description and provide an ATS compatibility score.

Job Description:
${jobDescription}

Resume:
${resumeContent}

Provide a detailed analysis in JSON format with:
{
  "overallScore": 0-100,
  "keywordMatch": 0-100,
  "semanticSimilarity": 0-100,
  "strengths": ["list of strengths"],
  "improvements": ["list of suggested improvements"],
  "missingKeywords": ["list of important missing keywords"],
  "matchedKeywords": ["list of matched keywords"]
}`;

    const result = await model.generateContent(prompt);
    const analysisText = result.response.text();
    
    // Parse JSON from response
    const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const analysis = JSON.parse(jsonMatch[0]);
      return {
        score: analysis.overallScore,
        keywordMatch: analysis.keywordMatch,
        semanticSimilarity: analysis.semanticSimilarity,
        analysis,
      };
    }

    throw new Error('Failed to parse ATS analysis');
  } catch (error) {
    console.error('Error calculating ATS score:', error);
    throw error;
  }
}

