import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GOOGLE_API_KEY || '';
export const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null as any;

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

// Upload a file to Gemini File Search
export async function uploadFileToGemini(
  filePath: string,
  mimeType: string,
  displayName: string
): Promise<any> {
  try {
    // TODO: Implement file upload using Gemini Files API
    // This requires the @google/generative-ai SDK to support file uploads
    // For now, return a placeholder
    console.log('File upload placeholder:', { filePath, mimeType, displayName });
    return { uri: 'placeholder-file-uri' };
  } catch (error) {
    console.error('Error uploading file to Gemini:', error);
    throw error;
  }
}

// Generate tailored resume using File Search
export async function generateTailoredResume(
  jobDescription: string,
  fileUris: string[],
  template: string
): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash-exp',
    });

    const prompt = `You are an expert resume writer and ATS optimization specialist.

Job Description:
${jobDescription}

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

Return the resume in a structured JSON format with sections.`;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });

    return result.response.text();
  } catch (error) {
    console.error('Error generating tailored resume:', error);
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

