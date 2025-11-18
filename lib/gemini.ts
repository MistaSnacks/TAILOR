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

// Generate tailored resume using File Search
export async function generateTailoredResume(
  jobDescription: string,
  fileUris: string[],
  template: string,
  parsedDocuments?: string[]
): Promise<string> {
  try {
    if (!genAI) {
      throw new Error('Gemini API key not configured');
    }

    console.log('⚡ Generating tailored resume:', {
      hasJobDescription: !!jobDescription,
      fileCount: fileUris.length,
      template,
      hasParsedDocs: !!parsedDocuments,
    });

    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash-exp',
    });

    // Build context from parsed documents if available
    let documentContext = '';
    if (parsedDocuments && parsedDocuments.length > 0) {
      documentContext = '\n\nUser\'s Resume Content:\n' + parsedDocuments.join('\n\n---\n\n');
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

    // If we have file URIs from Gemini Files API, use them
    const parts: any[] = [{ text: prompt }];
    
    // Note: File URIs from Gemini Files API would be used here
    // but the current SDK version may not support file references in generation
    // For now, we rely on the parsed content

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
  fileUris: string[]
): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash-exp',
    });

    const chat = model.startChat({
      history: conversationHistory.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }],
      })),
    });

    const result = await chat.sendMessage(message);
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

