import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server';
import { logSecretUsage } from './env-logger';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import type { TargetedProfilePayload, WriterExperience, WriterBulletCandidate } from './rag/selection-types';

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

const TEMPLATE_STYLE_GUIDANCE: Record<string, string> = {
  modern:
    'Modern template: concise, metric-heavy bullets, bold action verbs, and an energetic executive summary.',
  classic:
    'Classic template: balanced, formal tone with polished phrasing and consistent punctuation.',
  technical:
    'Technical template: highlight systems thinking, architecture decisions, stack expertise, and measurable engineering impact.',
};

const PLACEHOLDER_EXACT = new Set(
  [
    'company name',
    'job title',
    'title',
    'position',
    'role',
    'your role',
    'your company',
    'your name',
    'full name',
    'city, state',
    'city',
    'state',
    'location',
    'not provided',
    'not specified',
    'n/a',
    'na',
    'tbd',
    'insert company',
    'insert title',
    'insert location',
    'placeholder',
    'sample company',
    'sample title',
    'lorem ipsum',
    'example company',
  ].map(value => value.toLowerCase())
);

const PLACEHOLDER_SNIPPETS = ['lorem ipsum', 'placeholder', 'sample text', 'dummy text', 'your@email.com'];

const MAX_EXPERIENCES_FOR_PROMPT = 5;
const MAX_BULLET_CONTEXT_PER_ROLE = 8;
export const MAX_BULLETS_PER_ROLE = 6;
const MAX_SKILLS_FOR_PROMPT = 12;

type PreparedWriterProfile = {
  experiences: WriterExperience[];
  droppedExperienceIds: string[];
  bulletCount: number;
  skills: string[];
  parsedJD: TargetedProfilePayload['parsedJD'];
};

function normalizeValue(value: unknown): string {
  if (typeof value === 'string') {
    return value.replace(/\s+/g, ' ').trim();
  }
  if (typeof value === 'number') {
    return String(value);
  }
  return '';
}

function hasMeaningfulValue(
  value: unknown,
  options: { allowPresent?: boolean; allowEmpty?: boolean } = {}
): boolean {
  const normalized = normalizeValue(value);
  if (!normalized) {
    return !!options.allowEmpty;
  }

  const lower = normalized.toLowerCase();

  if (options.allowPresent && /present/.test(lower)) {
    return true;
  }

  if (PLACEHOLDER_EXACT.has(lower)) {
    return false;
  }

  for (const snippet of PLACEHOLDER_SNIPPETS) {
    if (lower.includes(snippet)) {
      return false;
    }
  }

  if (/[Y]{3,}/.test(normalized)) {
    return false;
  }

  return true;
}

function sanitizeOptional(value: unknown): string | undefined {
  const normalized = normalizeValue(value);
  if (!normalized) {
    return undefined;
  }
  return hasMeaningfulValue(normalized, { allowPresent: true }) ? normalized : undefined;
}

function dedupeStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const results: string[] = [];

  for (const value of values) {
    const normalized = normalizeValue(value);
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    results.push(normalized);
  }

  return results;
}

function parseDateValue(raw: unknown): number {
  const normalized = normalizeValue(raw);
  if (!normalized) {
    return Number.NEGATIVE_INFINITY;
  }

  if (/present/i.test(normalized)) {
    return Number.POSITIVE_INFINITY;
  }

  let isoCandidate = normalized;

  if (/^\d{4}$/.test(normalized)) {
    isoCandidate = `${normalized}-12-31`;
  } else if (/^\d{4}-\d{2}$/.test(normalized)) {
    isoCandidate = `${normalized}-01`;
  } else if (/^\d{2}\/\d{4}$/.test(normalized)) {
    const [month, year] = normalized.split('/');
    isoCandidate = `${year}-${month.padStart(2, '0')}-01`;
  }

  const timestamp = Date.parse(isoCandidate);
  if (Number.isNaN(timestamp)) {
    return Number.NEGATIVE_INFINITY;
  }

  return timestamp;
}

function formatDateLabel(raw: unknown, fallback?: string): string {
  const normalized = normalizeValue(raw);
  if (!normalized && fallback) {
    return fallback;
  }

  if (/present/i.test(normalized)) {
    return 'Present';
  }

  if (/^\d{4}-\d{2}$/.test(normalized)) {
    return normalized;
  }

  if (/^\d{4}$/.test(normalized)) {
    return normalized;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return normalized.slice(0, 7);
  }

  if (/^\d{2}\/\d{4}$/.test(normalized)) {
    const [month, year] = normalized.split('/');
    return `${year}-${month.padStart(2, '0')}`;
  }

  return normalized || fallback || '';
}

function isExperienceRenderable(exp: any): boolean {
  const hasCompany = hasMeaningfulValue(exp?.company);
  const hasTitle = hasMeaningfulValue(exp?.title);
  const hasStart = hasMeaningfulValue(exp?.start_date);
  const hasEndOrCurrent =
    hasMeaningfulValue(exp?.end_date, { allowPresent: true }) || Boolean(exp?.is_current);

  return Boolean(exp?.id) && hasCompany && hasTitle && hasStart && hasEndOrCurrent;
}

function prepareWriterProfile(profile: TargetedProfilePayload): PreparedWriterProfile {
  const experiences = Array.isArray(profile?.experiences) ? profile.experiences : [];
  const topSkills = Array.isArray(profile?.topSkills) ? profile.topSkills : [];

  // 🔍 Debug logging (REMOVE IN PRODUCTION)
  console.log('📝 Preparing writer profile:', {
    inputExperiences: experiences.length,
    experiencesWithBullets: experiences.filter(
      (exp) => Array.isArray(exp?.bullet_candidates) && exp.bullet_candidates.length > 0
    ).length,
    experiencesWithoutBullets: experiences.filter(
      (exp) => !Array.isArray(exp?.bullet_candidates) || exp.bullet_candidates.length === 0
    ).map((exp) => ({
      id: exp?.experience_id,
      company: exp?.company,
      title: exp?.title,
      bulletCount: Array.isArray(exp?.bullet_candidates) ? exp.bullet_candidates.length : 0,
    })),
  });

  const eligibleExperiences = experiences
    .filter(
      (experience) =>
        hasMeaningfulValue(experience?.company) &&
        hasMeaningfulValue(experience?.title) &&
        Array.isArray(experience?.bullet_candidates) &&
        experience.bullet_candidates.length > 0
    )
    .map((experience) => ({
      ...experience,
      bullet_candidates: experience.bullet_candidates
        .slice(0, MAX_BULLET_CONTEXT_PER_ROLE)
        .map((candidate) => ({
          ...candidate,
          text: normalizeValue(candidate.text),
          source_ids: candidate.source_ids ?? [],
        })),
    }));

  const orderedExperiences = eligibleExperiences
    .sort((a, b) => {
      const endDiff = parseDateValue(b.end) - parseDateValue(a.end);
      if (endDiff !== 0) return endDiff;
      return parseDateValue(b.start) - parseDateValue(a.start);
    })
    .slice(0, MAX_EXPERIENCES_FOR_PROMPT);

  const bulletCount = orderedExperiences.reduce(
    (sum, experience) => sum + experience.bullet_candidates.length,
    0
  );

  const skills = dedupeStrings(topSkills).slice(0, MAX_SKILLS_FOR_PROMPT);

  const droppedExperienceIds = experiences
    .filter(
      (experience) =>
        !orderedExperiences.some(
          (selected) => selected.experience_id === experience.experience_id
        )
    )
    .map((experience) => experience.experience_id)
    .filter(Boolean);

  return {
    experiences: orderedExperiences,
    droppedExperienceIds,
    bulletCount,
    skills,
    parsedJD: profile.parsedJD,
  };
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

// Generate tailored resume using Atomic RAG
export async function generateTailoredResumeAtomic(
  jobDescription: string,
  template: string,
  profile: TargetedProfilePayload
): Promise<string> {
  try {
    if (!genAI) {
      throw new Error('Gemini API key not configured');
    }

    const preparedProfile = prepareWriterProfile(profile);

    if (!preparedProfile.experiences.length) {
      throw new Error('No canonical experiences available for generation');
    }

    // 🔍 Generation context (REMOVE IN PRODUCTION)
    console.log('🧱 Atomic generator context (REMOVE IN PRODUCTION):', {
      template,
      experiencesUsed: preparedProfile.experiences.length,
      bulletPool: preparedProfile.bulletCount,
      skillsUsed: preparedProfile.skills.length,
      droppedExperienceIds: preparedProfile.droppedExperienceIds.length,
      parsedJobTitle: preparedProfile.parsedJD?.normalizedTitle || 'n/a',
    });

    const templateGuidance =
      TEMPLATE_STYLE_GUIDANCE[template as keyof typeof TEMPLATE_STYLE_GUIDANCE] ||
      TEMPLATE_STYLE_GUIDANCE.modern;

    const jobDescriptionSnippet = (jobDescription || '').trim().slice(0, 6000);

    const experienceContext = preparedProfile.experiences
      .map((exp: WriterExperience, index: number) => {
        const bulletLines = exp.bullet_candidates
          .map(
            (candidate: WriterBulletCandidate, bulletIndex: number) =>
              `      ${bulletIndex + 1}. [score=${candidate.score}] ${candidate.text} | sources: ${
                candidate.source_ids?.join(', ') || 'n/a'
              }`
          )
          .join('\n');

        return `${index + 1}. ${exp.title} @ ${exp.company} (${formatDateLabel(exp.start)} - ${formatDateLabel(
          exp.end,
          exp.is_current ? 'Present' : ''
        )})${exp.location ? ` | ${exp.location}` : ''}
      Experience ID: ${exp.experience_id}
      Bullet budget: ${exp.bullet_budget}
      Candidate Achievements:
${bulletLines || '      (No supporting achievements available)'}`;
      })
      .join('\n\n');

  const skillContext = preparedProfile.skills.length
    ? preparedProfile.skills.join(', ')
    : 'None provided (leave skills array empty)';

  const droppedExperienceSummary =
    preparedProfile.droppedExperienceIds.length > 0
      ? preparedProfile.droppedExperienceIds.join(', ')
      : 'None';

  const canonicalSnapshot = `Canonical Profile Snapshot:
- Selected experiences: ${preparedProfile.experiences.length}/${profile.experiences?.length ?? 0}
- Dropped experience IDs (missing fields/placeholders): ${droppedExperienceSummary}
- Bullet inventory available: ${preparedProfile.bulletCount}`;

  const atsFormatGuide = `ATS Output Contract (JSON only):
- Sections (in order): summary, experience, skills, education, certifications.
- summary: two sentences tying verified impact to the target job using canonical metrics only.
- experience: array matching the canonical inventory order; each object must include company, title, optional location, startDate (YYYY-MM), endDate (YYYY-MM or Present), and bullets.
- bullets: array of objects with "text" and "source_ids". Never exceed the provided bullet_budget per experience and never fabricate source_ids.
- skills: subset of the normalized pool (max ${MAX_SKILLS_FOR_PROMPT}); never invent new skills or vary casing.
- education & certifications: include only if canonical data exists, otherwise return empty arrays.`;

    const prompt = `You are an expert resume writer and ATS optimization specialist. Your only sources of truth are the canonical blocks below.

Template tone: ${templateGuidance}

Target Job Description (truncated to 6k chars):
${jobDescriptionSnippet || 'Not provided'}

${canonicalSnapshot}

Parsed JD Summary:
- Normalized Title: ${preparedProfile.parsedJD?.normalizedTitle || 'n/a'}
- Seniority: ${preparedProfile.parsedJD?.level || 'IC'}
- Domain: ${preparedProfile.parsedJD?.domain || 'general'}
- Responsibilities: ${preparedProfile.parsedJD?.responsibilities?.slice(0, 6).join('; ') || 'n/a'}
- Hard Skills: ${preparedProfile.parsedJD?.hardSkills?.join(', ') || 'n/a'}
- Soft Skills: ${preparedProfile.parsedJD?.softSkills?.join(', ') || 'n/a'}

Canonical Experience Inventory (reverse chronological order, IDs are stable — do NOT reorder):
${experienceContext}

Normalized Skill Pool (deduped, limit ${MAX_SKILLS_FOR_PROMPT}):
${skillContext}

Quality Guardrails:
- Use ONLY the canonical experiences and skills supplied above. Never invent new companies, titles, dates, or credentials.
- Preserve the experience order exactly as provided; the inventory is already most recent first.
- Company, title, location, and date strings must match the canonical values verbatim (trim whitespace only).
- Strip any placeholder fragments (e.g., "Company Name", "City, State", "N/A", strings containing "YYYY") from every field and bullet.
- Each bullet must follow the Action + Context + Result rubric, highlight measurable scope/impact when available, and remain grounded in the supporting achievements for that role.
- Respect the bullet_budget per experience. If the candidate pool is smaller than the budget, output only the vetted bullets; do not fabricate content.
- When merging multiple candidate bullets, preserve the strongest metric and union of verified tools/regulations, then log the contributing candidate IDs in "merged_from".
- Professional summary must be exactly two sentences referencing the target role and at least two verified impact themes from the canonical experiences.
- Skills list must be a deduped subset of the normalized pool ordered by relevance to the target JD.

${atsFormatGuide}

Return JSON ONLY (no prose) using this schema:
{
  "summary": "...",
  "experience": [
    {
      "company": "...",
      "title": "...",
      "location": "...",
      "startDate": "YYYY-MM",
      "endDate": "YYYY-MM or Present",
      "bullets": [
        {
          "text": "...",
          "source_ids": ["canonical-bullet-id"],
          "merged_from": ["optional-candidate-ids"]
        }
      ]
    }
  ],
  "skills": ["..."],
  "education": [],
  "certifications": []
}`;

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.4,
        topP: 0.8,
      },
    });

    const result = await model.generateContent(prompt);
    const response = result.response.text();
    console.log('✅ Atomic Resume generated successfully');
    return response;

  } catch (error) {
    console.error('❌ Error generating atomic resume:', error);
    throw error;
  }
}

// Generate tailored resume using File Search (Legacy)
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

