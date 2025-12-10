import OpenAI from 'openai';
import { logSecretUsage } from './env-logger';
import type { TargetedProfilePayload, WriterExperience, WriterBulletCandidate } from './rag/selection-types';

const apiKey = process.env.OPENAI_API_KEY || '';

// Log OpenAI API key status (REMOVE IN PRODUCTION)
logSecretUsage('OPENAI_API_KEY', !!apiKey);

export const openai = apiKey ? new OpenAI({ apiKey }) : null as any;

// File reference type (OpenAI doesn't use file URIs like Gemini - we'll pass text directly)
export type OpenAIFileReference = {
  text: string;
  mimeType: string;
};

// Legacy type alias for compatibility during migration
export type GeminiFileReference = OpenAIFileReference;

export const MAX_BULLETS_PER_ROLE = 6;

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
    'insert title',
    'insert company',
    'sample company',
    'sample title',
    'example company',
    'example title',
    'lorem ipsum',
    'placeholder',
    'city, state',
    'mm/yyyy',
    'month year',
    'yyyy',
    'yyyy-yyyy',
    '20xx',
    'tbd',
    'n/a',
    'not provided',
    'not available',
    'to be determined',
  ].map((s) => s.toLowerCase())
);

const PLACEHOLDER_SNIPPETS = [
  'company name',
  'job title',
  'your company',
  'insert',
  'sample',
  'example',
  'lorem',
  'placeholder',
];

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Prompt limits
const MAX_EXPERIENCES_FOR_PROMPT = 8;
const MAX_BULLET_CONTEXT_PER_ROLE = 12;
const MAX_SKILLS_FOR_PROMPT = 40; // Increased to 40 for fuller skill coverage
const MAX_INFERENCE_CONTEXT_LINES = 20;

function buildFileParts(references: OpenAIFileReference[] = []) {
  // OpenAI doesn't support file URIs like Gemini
  // Instead, we'll include file content directly in the prompt
  return references
    .filter(ref => ref.text)
    .map(ref => ({
      role: 'user' as const,
      content: ref.text,
    }));
}

// Generate embeddings for semantic search / chunk ranking
export async function embedText(text: string): Promise<number[]> {
  if (!openai) {
    throw new Error('OpenAI API key not configured');
  }

  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small', // Cost-effective: $0.02 per 1M tokens
      input: text,
      dimensions: 768, // Match Gemini text-embedding-004 dimensions for database compatibility
    });

    const embedding = response.data[0]?.embedding;
    if (!embedding || embedding.length === 0) {
      throw new Error('Failed to generate embedding');
    }

    return embedding;
  } catch (error) {
    console.error('❌ Error generating embedding:', error);
    throw error;
  }
}

// Generate tailored resume using Atomic RAG
export async function generateTailoredResumeAtomic(
  jobDescription: string,
  template: string,
  profile: TargetedProfilePayload
): Promise<string> {
  try {
    if (!openai) {
      throw new Error('OpenAI API key not configured');
    }

    // Prepare profile data (same as Gemini version)
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
              `      ${bulletIndex + 1}. [score=${candidate.score}] ${candidate.text} | sources: ${candidate.source_ids?.join(', ') || 'n/a'
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

    const skillSource =
      (profile.canonicalSkillPool?.length ?? 0) > 0
        ? profile.canonicalSkillPool!
        : preparedProfile.skills;

    const skillContext = skillSource.length
      ? skillSource.join(', ')
      : 'None provided (leave skills array empty)';

    const educationContext = (profile.education?.length ?? 0) > 0
      ? profile.education!.map((edu, i) => {
        let dateStr = '';
        if (edu.startDate && edu.endDate) {
          dateStr = ` (${formatDateLabel(edu.startDate)} - ${formatDateLabel(edu.endDate)})`;
        } else if (edu.endDate || edu.graduationDate) {
          dateStr = ` (${formatDateLabel(edu.endDate || edu.graduationDate)})`;
        } else if (edu.startDate) {
          dateStr = ` (Started ${formatDateLabel(edu.startDate)})`;
        }
        return `${i + 1}. ${edu.degree || 'Degree'} in ${edu.field || 'Field'} - ${edu.institution}${dateStr}`;
      }).join('\n')
      : 'None provided (return empty array)';

    const certificationContext = (profile.certifications?.length ?? 0) > 0
      ? profile.certifications!.map((cert, i) =>
        `${i + 1}. ${cert.name}${cert.issuer ? ` - ${cert.issuer}` : ''}${cert.date ? ` (${formatDateLabel(cert.date)})` : ''}`
      ).join('\n')
      : 'None provided (return empty array)';

    const contactFields: string[] = [];
    const contactInfo = preparedProfile.contactInfo;
    if (contactInfo?.name) contactFields.push(`Name: ${contactInfo.name}`);
    if (contactInfo?.email) contactFields.push(`Email: ${contactInfo.email}`);
    if (contactInfo?.phone) contactFields.push(`Phone: ${contactInfo.phone}`);
    if (contactInfo?.linkedin) contactFields.push(`LinkedIn: ${contactInfo.linkedin}`);
    if (contactInfo?.portfolio) contactFields.push(`Portfolio: ${contactInfo.portfolio}`);

    const contactInfoContext = contactFields.length > 0
      ? contactFields.join('\n')
      : 'None provided (omit contactInfo from output)';

    const inferenceHighlightContext =
      preparedProfile.inferenceContext?.experienceHighlights?.length
        ? preparedProfile.inferenceContext.experienceHighlights
          .slice(0, MAX_INFERENCE_CONTEXT_LINES)
          .map((highlight: string, index: number) => `${index + 1}. ${highlight}`)
          .join('\n')
        : profile.inferenceContext?.experienceHighlights?.length
          ? profile.inferenceContext.experienceHighlights
            .slice(0, MAX_INFERENCE_CONTEXT_LINES)
            .map((highlight: string, index: number) => `${index + 1}. ${highlight}`)
            .join('\n')
          : 'Not provided (limit inference to verified bullets)';

    const inferenceMetricContext =
      profile.inferenceContext?.metricSignals?.length
        ? profile.inferenceContext.metricSignals
          .slice(0, MAX_INFERENCE_CONTEXT_LINES)
          .map((signal, index) => `${index + 1}. ${signal}`)
          .join('\n')
        : 'Not provided (reference explicit metrics when available)';

    const inferenceGuidance =
      profile.inferenceContext?.instructions ||
      'Derive new JD-aligned bullets when logically implied by the candidate\'s verified work. Domain-level inferences are encouraged (e.g., "Fraud Analyst" → "Fraud Risk Management", "Credit card disputes" → "Digital Payments"). Reframe bullets to emphasize JD-relevant aspects while staying truthful. Use JD terminology when it accurately describes the candidate\'s experience. Reference the supporting company or highlight when making inferences.';

    const droppedExperienceSummary =
      preparedProfile.droppedExperienceIds.length > 0
        ? preparedProfile.droppedExperienceIds.join(', ')
        : 'None';

    const canonicalSnapshot = `Canonical Profile Snapshot:
- Selected experiences: ${preparedProfile.experiences.length}/${profile.experiences?.length ?? 0}
- Dropped experience IDs (missing fields/placeholders): ${droppedExperienceSummary}
- Bullet inventory available: ${preparedProfile.bulletCount}`;

    const inferenceSnapshot = `Global Canonical Highlights (available for inference beyond the selected roles):
${inferenceHighlightContext}

Metric / Impact Signals (use these to justify quantified rewrites):
${inferenceMetricContext}

Inference Guidance:
${inferenceGuidance}`;

    const atsFormatGuide = `ATS Output Contract (JSON only):
- Sections (in order): contactInfo, summary, experience, skills, education, certifications. Note: Skills appear AFTER experience in the final document.
- contactInfo: Include ONLY the fields that exist in canonical data (name, email, phone, linkedin, portfolio). NEVER include address or location in contact info.
- summary: 3-4 sentences (minimum 350 characters) that: (1) open with years of experience and primary domain expertise, (2) highlight 2-3 verified quantified achievements with specific metrics from canonical experiences, (3) mention key tools/skills relevant to the target JD, and (4) close by connecting the candidate's background to the target role's core requirements.
- experience: array matching the canonical inventory order; each object must include company, title, optional location, startDate ("Month Year" format), endDate ("Month Year" or "Present"), and bullets.
- bullets: array of objects with "text" and "source_ids". Never exceed the provided bullet_budget per experience and never fabricate source_ids.
- skills: subset of the normalized pool (max ${MAX_SKILLS_FOR_PROMPT}); never invent new skills or vary casing.
- education: each entry MUST include institution name, degree, field of study, and startDate/endDate or graduationDate if available from canonical data. Use "Month Year" format for dates.
- certifications: each entry MUST include certification name and issuing organization from the canonical data.`;

    const prompt = `You are an expert resume writer and ATS optimization specialist. Your only sources of truth are the canonical blocks below.

=== CRITICAL EDITING DIRECTIVE (READ FIRST - THIS IS YOUR PRIMARY OBJECTIVE) ===

**YOU MUST ACTIVELY REWRITE AND ENHANCE BULLETS** - Do not preserve weak bullets as-is. Your job is to optimize every bullet for JD alignment.

MANDATORY Edit Philosophy:
- **REQUIRED**: Enhance and reframe bullets to improve JD alignment while staying 100% truthful
- **EXPECTED**: At least 60-80% of bullets should be REWRITTEN or significantly enhanced. If you're keeping most bullets unchanged, you are FAILING at your job.
- The goal is OPTIMIZATION, not preservation — users expect AI to IMPROVE their resume
- Strong bullets SHOULD be enhanced if you see ANY opportunity for better JD alignment
- Weaker bullets MUST be reframed to emphasize JD-relevant aspects
- After reviewing each bullet, ask yourself: "Did I improve this bullet or just copy it?" If you just copied it, you failed.

Template tone: ${templateGuidance}

Target Job Description (truncated to 6k chars):
${jobDescriptionSnippet || 'Not provided'}

${canonicalSnapshot}

${inferenceSnapshot}

Parsed JD Summary:
- Normalized Title: ${preparedProfile.parsedJD?.normalizedTitle || 'n/a'}
- Seniority: ${preparedProfile.parsedJD?.level || 'IC'}
- Domain: ${preparedProfile.parsedJD?.domain || 'general'}
- Responsibilities: ${preparedProfile.parsedJD?.responsibilities?.slice(0, 8).join('; ') || 'n/a'}
- Hard Skills (MUST include these in resume where truthful): ${preparedProfile.parsedJD?.hardSkills?.slice(0, 40).join(', ') || 'n/a'}
- Soft Skills (weave into bullets naturally): ${preparedProfile.parsedJD?.softSkills?.slice(0, 15).join(', ') || 'n/a'}
- Key Phrases (CRITICAL: use exact phrasing when possible - prefer JD phrases over generic equivalents): ${preparedProfile.parsedJD?.keyPhrases?.slice(0, 15).join(', ') || 'n/a'}

JD Phrase Matching Rule:
- When the JD uses specific phrases (e.g., "fraud risk management", "digital payments operations"), prefer these exact phrases over generic equivalents when both accurately describe the candidate's experience. This improves ATS keyword matching.

Canonical Experience Inventory (reverse chronological order, IDs are stable — do NOT reorder):
${experienceContext}

Normalized Skill Pool (deduped, limit ${MAX_SKILLS_FOR_PROMPT}):
${skillContext}

Canonical Education:
${educationContext}

Canonical Certifications:
${certificationContext}

Canonical Contact Information (only include fields with values, NEVER include address):
${contactInfoContext}

Quality Guardrails:
- Use ONLY the canonical experiences and skills supplied above. Never invent new companies, titles, dates, or credentials.
- Preserve the experience order exactly as provided; the inventory is already most recent first.
- Company, title, location, and date strings must match the canonical values verbatim (trim whitespace only).
- CRITICAL: Strip ALL placeholder fragments from every field and bullet. This includes but is not limited to: "Company Name", "Job Title", "City, State", "N/A", "Not Provided", "Not Available", "TBD", "YYYY", "YYYY-MM", "20XX", "Example Company", "Your Company", "Insert Title", "Sample Text", "Lorem Ipsum", or any text containing placeholder patterns like {{}}, [[]], <>, or repeated X/Y/Z characters. If a field contains placeholder text, omit that field entirely rather than including placeholder content.
- Each bullet must follow the Action + Context + Result rubric, highlight measurable scope/impact when available, and remain grounded in the supporting achievements for that role.
- Respect the bullet_budget per experience. If the candidate pool is smaller than the budget, output only the vetted bullets; do not fabricate content.
- When merging multiple candidate bullets, preserve the strongest metric and union of verified tools/regulations, then log the contributing candidate IDs in "merged_from".
    - Professional summary must be a single cohesive paragraph of 3-4 impactful sentences (minimum 350 characters). Do NOT use bullet points. The summary must: (1) open with years of experience and primary domain expertise, (2) highlight 1-2 key achievements that demonstrate meaningful impact - metrics are optional, only include them if they are genuinely compelling and relevant to the target role, (3) mention 2-3 key tools or skills that directly match the target JD requirements, and (4) close with a clear connection to the target role's core responsibilities. Focus on telling a compelling career narrative rather than metric-stuffing. AVOID generic metrics like "Analyzed 100+ reports" - if a metric doesn't clearly demonstrate impact, omit it.

=== BULLET REWRITING REMINDER (APPLY THE DIRECTIVE ABOVE) ===

You ALREADY saw the CRITICAL EDITING DIRECTIVE at the top. Now apply it. Remember: 60-80% of bullets should be REWRITTEN, not copied.

Domain-Level Inference (MANDATORY - Use liberally):
- You MUST infer domain-level connections when logically implied by the candidate's verified work. Do not skip this step. Examples:
  * "Fraud Analyst" or "Fraud Operations Manager" → Can infer "Fraud Risk Management", "Fraud Detection", "Fraud Prevention" domains
  * "Credit card disputes" or "ACH chargebacks" → Can infer "Digital Payments", "Credit Card Ecosystem", "Digital Payments Operations"
  * "Team leadership" or "Led team" → Can infer "Project Management", "Stakeholder Management", "Cross-functional Collaboration"
  * "Data analysis using SQL/Python" → Can infer "Data Analysis", "Data Processing", "Analytics" when used for analysis work
  * "Machine Learning" or "ML" → Can connect to "AI", "Automated Systems", "Predictive Analytics" when contextually appropriate
- Use JD terminology when it accurately describes the candidate's experience, even if the exact phrase wasn't in the original bullet. For example, if JD uses "fraud risk management" and candidate has "fraud detection" experience, use the JD phrase.

Bullet Reframing (MANDATORY when natural connection exists):
- You MUST reframe bullets to emphasize JD-relevant aspects while staying 100% truthful to the candidate's verified work. Do not skip reframing when connections exist.
- When reframing, expand context to highlight JD-aligned terminology. Example:
  * Original: "Analyzed account patterns"
  * Reframed: "Analyzed account and transaction patterns using data analysis techniques to identify emerging fraud trends and refine fraud decisioning best practices"
- Incorporate JD keywords naturally when they accurately describe the candidate's verified achievements.
- Prefer JD phrases over generic equivalents when both are truthful (e.g., use "fraud risk management" from JD instead of generic "fraud management" if both apply).
- If no natural JD connection exists for a bullet, focus on quality improvement (ACR rubric) instead of forcing keywords.

Skills Enhancement:
- Skills list must be a deduped subset of the normalized pool ordered by relevance to the target JD.
- Include domain-level skill synonyms when they are logically implied (e.g., "Fraud Detection" → also include "Fraud Risk Management" if JD emphasizes it).
- When JD uses specific skill phrases, prefer those exact phrases over generic equivalents when both accurately describe the candidate's experience.
- Expand technical skills to include domain applications when appropriate (e.g., "SQL" + fraud work → include "Fraud Analytics" if JD emphasizes analytics).

${atsFormatGuide}

Return JSON ONLY (no prose) using this schema:
{
  "contactInfo": {
    "name": "Full Name (REQUIRED if available)",
    "email": "email@example.com (optional)",
    "phone": "phone number (optional)",
    "linkedin": "linkedin.com/in/username (optional)",
    "portfolio": "portfolio URL (optional)"
  },
  "summary": "...",
  "experience": [
    {
      "company": "...",
      "title": "...",
      "location": "...",
      "startDate": "Month Year (e.g., Nov 2024)",
      "endDate": "Month Year or Present",
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
  "education": [
    {
      "institution": "School/University Name (REQUIRED)",
      "degree": "Degree Type",
      "field": "Field of Study",
      "startDate": "Month Year (optional)",
      "endDate": "Month Year (optional)",
      "graduationDate": "Month Year or Year (use if start/end not available)"
    }
  ],
  "certifications": [
    {
      "name": "Certification Name",
      "issuer": "Issuing Organization (REQUIRED)",
      "date": "Month Year or Year"
    }
  ]
}

IMPORTANT: Only include contactInfo fields that have actual values from canonical data. Omit any empty or missing fields. NEVER include address.`;

    const generationStartTime = Date.now();
    console.log('⏱️ (IS $) Resume generation - Starting OpenAI API call...');
    const response = await openai.chat.completions.create({
      model: 'gpt-4o', // Most powerful OpenAI model
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' }, // JSON mode for structured output
      temperature: 0.5, // Increased for more creative edits and JD alignment
      top_p: 0.9,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    const generationTime = Date.now() - generationStartTime;
    console.log(`⏱️ (IS $) Resume generation OpenAI API call completed in ${(generationTime / 1000).toFixed(1)}s`);
    console.log('✅ Atomic Resume generated successfully');
    return content;

  } catch (error) {
    console.error('❌ Error generating atomic resume:', error);
    throw error;
  }
}

// Legacy function - placeholder for compatibility
export async function generateTailoredResume(
  jobDescription: string,
  template: string,
  context: any = {}
): Promise<string> {
  // Redirect to atomic version
  throw new Error('Legacy generateTailoredResume not supported with OpenAI. Use generateTailoredResumeAtomic instead.');
}

// Chat with documents
export async function chatWithDocuments(
  message: string,
  conversationHistory: Array<{ role: string; content: string }>,
  context: any = {}
): Promise<string> {
  if (!openai) {
    throw new Error('OpenAI API key not configured');
  }

  const formattedHistory = conversationHistory.map((msg) => ({
    role: msg.role === 'user' ? 'user' : 'assistant',
    content: msg.content,
  }));

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      ...formattedHistory,
      { role: 'user', content: message },
    ],
    temperature: 0.7,
  });

  return response.choices[0]?.message?.content || '';
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
  if (!openai) {
    throw new Error('OpenAI API key not configured');
  }

  const truncatedJobDesc = jobDescription.substring(0, 6000);
  const truncatedResume = resumeContent.substring(0, 8000);

  const prompt = `You are an expert ATS (Applicant Tracking System) analyzer. Analyze this resume against the job description and provide a detailed compatibility score breakdown.

<scoring_methodology>
Step 1: Extract JD Components
From the job description, identify:
- Critical keywords (must-have requirements) - from "Required", "Must have", "Essential"
- Important keywords (nice-to-have) - from "Preferred", "Nice to have", "Bonus"
- Nice-to-have keywords (bonus) - from "Additional qualifications"

For each keyword, include:
- Exact quote from JD
- Category (Language, Tool, Framework, Soft Skill, etc.)
- Context (how it's used)
- Proficiency level if mentioned
- Years of experience if stated

Implicit Requirements Rule:
- HIGH confidence: "Backend engineer" → implies database/API design
- MEDIUM confidence: "Microservices" → might imply Docker (but not always)
- LOW confidence: "Startup" → too vague, don't infer
Only include HIGH/MEDIUM with reasoning noted.

Step 2: Match Resume Keywords
For each JD keyword, check:
- Exact match: "Python" = "Python" → 1.0
- Semantic match: "APIs" ≈ "REST API" → 0.8
- Partial match: "SQL" ≈ "PostgreSQL" → 0.4
- No match → 0

Semantic Equivalences:
- "APIs" ≈ "REST API", "HTTP endpoints", "web services"
- "SQL" ≈ "PostgreSQL", "MySQL", "relational database"
- "Leadership" ≈ "Led team", "managed engineers", "mentored"

Step 3: Calculate Score by Category
For each tier:
category_score = (matches / total_keywords) × 100

final_score = 0.4 × critical + 0.35 × important + 0.25 × nice_to_have

Step 4: Interpret Score
90-100%: Excellent. Direct match to requirements.
75-89%: Good. Minor gaps.
60-74%: Moderate. Some important skills missing.
40-59%: Weak. Major gaps.
<40%: Very weak. Don't apply without strong connections.
</scoring_methodology>

Job Description:
${truncatedJobDesc}

Resume:
${truncatedResume}

Score EACH of these 5 categories from 0-100, being STRICT and realistic like real ATS systems (Jobscan, etc.):

1. **hardSkills** (Weight: 35%): Technical abilities, tools, technologies, programming languages, certifications, methodologies explicitly mentioned in the job description. Score based on:
   - Exact match of required technical skills (e.g., Python, AWS, SQL)
   - Required certifications present
   - Years of experience with specific technologies
   - Be strict: if a hard skill is required but not present, heavily penalize

2. **softSkills** (Weight: 10%): Interpersonal abilities like leadership, communication, teamwork, problem-solving mentioned in the job description. Score based on:
   - Presence of relevant soft skills in bullet points
   - Evidence of soft skills through achievements (led team of X, collaborated with...)

3. **keywords** (Weight: 25%): Exact terminology matches from job description. Score based on:
   - Job title match or close variation
   - Industry-specific terminology
   - Action verbs that match job requirements
   - Company-specific language if identifiable

4. **semanticMatch** (Weight: 20%): Contextual relevance even without exact matches. Score based on:
   - Synonymous terms (e.g., "software engineer" vs "developer")
   - Related experience in same domain
   - Transferable accomplishments
   - Overall career trajectory alignment

5. **searchability** (Weight: 10%): How well the resume is optimized for ATS parsing. Score based on:
   - Clear section headers (Experience, Education, Skills)
   - Proper date formats
   - Standard job title formats
   - Consistent formatting
   - No complex tables/graphics that ATS can't parse

Return JSON in this exact format:
{
  "final_score": <0-100>,
  "score_interpretation": "Excellent Match (90-100)|Good Match (75-89)|Moderate Match (60-74)|Weak Match (40-59)|Very Weak (<40)",
  "recommendation": "Safe to apply|Minor gaps can be addressed|Some important skills missing|Major gaps|Don't apply without strong connections",
  
  "category_breakdown": {
    "critical": {"score": <0-100>, "matched": <count>, "missing": <count>, "matched_keywords": ["..."], "missing_keywords": ["..."]},
    "important": {"score": <0-100>, "matched": <count>, "missing": <count>, "matched_keywords": ["..."], "missing_keywords": ["..."]},
    "nice_to_have": {"score": <0-100>, "matched": <count>, "missing": <count>, "matched_keywords": ["..."], "missing_keywords": ["..."]}
  },
  
  "metrics": {
    "hardSkills": <0-100>,
    "softSkills": <0-100>,
    "keywords": <0-100>,
    "semanticMatch": <0-100>,
    "searchability": <0-100>
  },
  "matchedHardSkills": ["list of matched hard skills from job description"],
  "missingHardSkills": ["list of required hard skills NOT in resume"],
  "matchedSoftSkills": ["list of matched soft skills"],
  "missingSoftSkills": ["list of soft skills from job NOT evidenced in resume"],
  "matchedKeywords": ["list of exact keyword matches"],
  "missingKeywords": ["list of important keywords NOT in resume"],
  "strengths": ["3-5 specific strengths of this resume for this job"],
  "gaps": ["list of specific gaps"],
  "actionable_improvements": [
    {
      "gap": "AWS",
      "impact": "Would improve score to 88%",
      "action": "If applicable, add any AWS experience"
    }
  ]
}

Be STRICT in your scoring. A perfect 100 should be rare. Most resumes score 60-80 for good matches.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini', // Fast and cost-effective for ATS scoring
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.1,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No response from OpenAI');
  }

  try {
    const parsed = JSON.parse(content);

    // Use final_score from new methodology if available, otherwise calculate weighted score
    let score: number;
    if (typeof parsed.final_score === 'number') {
      score = Math.round(parsed.final_score);
    } else {
      // Fallback to legacy calculation
      const metrics = parsed.metrics || {};
      score = Math.round(
        (metrics.hardSkills || 0) * 0.35 +
        (metrics.softSkills || 0) * 0.10 +
        (metrics.keywords || 0) * 0.25 +
        (metrics.semanticMatch || 0) * 0.20 +
        (metrics.searchability || 0) * 0.10
      );
    }

    const metrics = parsed.metrics || {};
    return {
      score,
      keywordMatch: metrics.keywords || 0,
      semanticSimilarity: metrics.semanticMatch || 0,
      analysis: {
        ...parsed,
        final_score: score,
        score_interpretation: parsed.score_interpretation || '',
        recommendation: parsed.recommendation || '',
        category_breakdown: parsed.category_breakdown || {},
      },
    };
  } catch (error) {
    console.error('❌ Error parsing ATS score:', error);
    throw error;
  }
}

// Helper functions (same as Gemini version)

function normalizeValue(value?: unknown): string {
  if (typeof value === 'string') {
    return value.trim();
  }
  if (value === null || value === undefined) {
    return '';
  }
  return String(value).trim();
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

  if (options.allowPresent && /present/i.test(lower)) {
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

function dedupeStrings(values: string[]): string[] {
  const seen = new Set<string>();
  return values.filter((value) => {
    const normalized = normalizeValue(value).toLowerCase();
    if (seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
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

  // YYYY-MM format -> "Month Year" (e.g., "Nov 2024")
  if (/^\d{4}-\d{2}$/.test(normalized)) {
    const [year, month] = normalized.split('-');
    const monthIndex = parseInt(month, 10) - 1;
    if (monthIndex >= 0 && monthIndex < 12) {
      return `${MONTH_NAMES[monthIndex]} ${year}`;
    }
    return normalized;
  }

  // Just year -> return as-is
  if (/^\d{4}$/.test(normalized)) {
    return normalized;
  }

  // YYYY-MM-DD format -> "Month Year"
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    const [year, month] = normalized.split('-');
    const monthIndex = parseInt(month, 10) - 1;
    if (monthIndex >= 0 && monthIndex < 12) {
      return `${MONTH_NAMES[monthIndex]} ${year}`;
    }
    return normalized.slice(0, 7);
  }

  // MM/YYYY format -> "Month Year"
  if (/^\d{2}\/\d{4}$/.test(normalized)) {
    const [month, year] = normalized.split('/');
    const monthIndex = parseInt(month, 10) - 1;
    if (monthIndex >= 0 && monthIndex < 12) {
      return `${MONTH_NAMES[monthIndex]} ${year}`;
    }
    return `${year}-${month.padStart(2, '0')}`;
  }

  return normalized || fallback || '';
}

function prepareWriterProfile(profile: TargetedProfilePayload): any {
  const experiences = Array.isArray(profile?.experiences) ? profile.experiences : [];
  const topSkills = Array.isArray(profile?.topSkills) ? profile.topSkills : [];

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
    education: profile.education,
    certifications: profile.certifications,
    contactInfo: profile.contactInfo,
    canonicalSkillPool: profile.canonicalSkillPool,
    inferenceContext: profile.inferenceContext,
  };
}

// Placeholder functions for file operations (OpenAI doesn't have file manager like Gemini)
export async function createOrUpdateFileSearchStore(userId: string): Promise<void> {
  console.warn('⚠️ File search store not supported with OpenAI - files must be passed as text');
}

export async function uploadFileToGemini(filePath: string, mimeType: string): Promise<string | null> {
  console.warn('⚠️ File upload not supported with OpenAI - pass file content as text instead');
  return null;
}

export async function uploadTextChunkToGemini(text: string, mimeType: string): Promise<string | null> {
  console.warn('⚠️ Text chunk upload not supported with OpenAI - pass text directly in prompt');
  return null;
}

