import { genAI, MAX_BULLETS_PER_ROLE } from './gemini';
import { normalizeResumeContent, type ResumeContent } from './resume-content';
import type { ParsedJobDescription } from './rag/job-types';

export type CriticIssue = {
  experience_id: string;
  bullet_index: number;
  issueType: 'too_generic' | 'missing_metric' | 'jd_gap' | 'redundant' | 'format';
  explanation: string;
  suggested_rewrite?: string;
};

export type CriticScorecard = {
  overall: number;
  keywordCoverage: number;
  semanticFit: number;
  metricDensity: number;
};

export type CritiquePayload = {
  score: CriticScorecard;
  issues: CriticIssue[];
};

export type ResumeCriticResult = {
  revisedResume: ResumeContent;
  critique: CritiquePayload;
};

const CRITIC_JOB_DESC_LIMIT = 5000;

function countBullets(resume: ResumeContent): number {
  return (resume.experience || []).reduce((sum, exp) => {
    const bullets = Array.isArray(exp?.bullets) ? exp.bullets.length : 0;
    return sum + bullets;
  }, 0);
}

function buildFallbackCritique(issue: string): CritiquePayload {
  return {
    score: {
      overall: 0,
      keywordCoverage: 0,
      semanticFit: 0,
      metricDensity: 0,
    },
    issues: [
      {
        experience_id: 'n/a',
        bullet_index: -1,
        issueType: 'format',
        explanation: issue,
      },
    ],
  };
}

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 5) return 5;
  return Math.round(value * 10) / 10;
}

export async function runResumeCritic({
  resumeDraft,
  jobDescription,
  parsedJob,
  maxBulletsPerExperience = MAX_BULLETS_PER_ROLE,
}: {
  resumeDraft: ResumeContent;
  jobDescription: string;
  parsedJob?: ParsedJobDescription;
  maxBulletsPerExperience?: number;
}): Promise<ResumeCriticResult> {
  if (!genAI) {
    throw new Error('Gemini API key not configured');
  }

  const normalizedDraft = normalizeResumeContent(resumeDraft);
  const truncatedJobDescription = (jobDescription || '').trim().slice(0, CRITIC_JOB_DESC_LIMIT);

  // 🔍 Critic context (REMOVE IN PRODUCTION)
  console.log('🧐 Resume critic context (REMOVE IN PRODUCTION):', {
    experienceCount: normalizedDraft.experience?.length || 0,
    bulletCount: countBullets(normalizedDraft),
    maxBulletsPerExperience,
  });

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.2,
      topP: 0.8,
    },
  });

  const prompt = `You are a resume quality critic enforcing the Action-Context-Result (ACR) rubric.

Job Description (truncated to ${CRITIC_JOB_DESC_LIMIT} chars):
${truncatedJobDescription || 'Not provided'}


Parsed JD Context:
- Title: ${parsedJob?.normalizedTitle || 'n/a'}
- Level: ${parsedJob?.level || 'IC'}
- Domain: ${parsedJob?.domain || 'general'}
- Responsibilities: ${parsedJob?.responsibilities?.slice(0, 6).join('; ') || 'n/a'}
- Hard Skills: ${parsedJob?.hardSkills?.join(', ') || 'n/a'}
- Soft Skills: ${parsedJob?.softSkills?.join(', ') || 'n/a'}

Draft Resume JSON:
${JSON.stringify(normalizedDraft, null, 2)}

Rubric per bullet:
1. Action: Does it start with a forceful verb and clarify ownership?
2. Context: Does it explain scope, product, team, or constraints?
3. Result: Does it quantify impact or describe measurable outcomes?
4. Relevance: Does it align to the job description's needs?

Tasks:
- Score every bullet 1-5 for each rubric dimension.
- Keep or rewrite a bullet only if it can reach >=3 in all dimensions using existing facts. Do NOT invent new companies, projects, or metrics.
- Remove duplicate or overlapping bullets; keep the best phrasing.
- Rewrite weak bullets using the ACR rubric while staying truthful to the supplied content.
- Enforce at most ${maxBulletsPerExperience} bullets per experience. Prioritize current/most relevant achievements.
- CRITICAL: Strip ALL placeholder text from every field. This includes: "Company Name", "Job Title", "City, State", "N/A", "Not Provided", "Not Available", "TBD", "YYYY", "YYYY-MM", "20XX", "Example Company", "Your Company", "Insert Title", "Sample Text", "Lorem Ipsum", or any placeholder patterns. If a field contains placeholder text, omit that field entirely.
- Keep company/title/location/dates exactly as provided. Never reorder experiences.
- Skills must stay de-duplicated and relevant to the job description.
- Summary must be 3-4 sentences (minimum 350 characters) that: (1) state years of experience and domain, (2) include 2-3 specific metrics from canonical experiences, (3) mention relevant tools/skills, and (4) connect to the target role. If the summary is too short or generic, rewrite it to meet these requirements using only verified facts.
- Capture issues per bullet referencing the resume's experience index (1-based) and bullet order (1-based). Flag reasons such as "too_generic", "missing_metric", "jd_gap", "redundant", or "format".
- Only propose a suggested_rewrite if it strictly reuses verified facts (same companies, tools, metrics) or rephrases for clarity.

Return JSON ONLY in this schema:
{
  "revisedResume": { ...same structure as input... },
  "critique": {
    "score": {
      "overall": 0-100,
      "keywordCoverage": 0-100,
      "semanticFit": 0-100,
      "metricDensity": 0-100
    },
    "issues": [
      {
        "experience_id": "exp-uuid-or-index",
        "bullet_index": 1,
        "issueType": "too_generic|missing_metric|jd_gap|redundant|format",
        "explanation": "...",
        "suggested_rewrite": "optional bullet text"
      }
    ]
  }
}`;

  const result = await model.generateContent(prompt);
  const responseText = result.response.text();

  try {
    const parsed = JSON.parse(responseText);
    const revisedResume = normalizeResumeContent(parsed?.revisedResume || parsed?.resume || {});
    const critiqueRaw = parsed?.critique || {};

    const critique: CritiquePayload = {
      score: {
        overall:
          typeof critiqueRaw?.score?.overall === 'number'
            ? critiqueRaw.score.overall
            : typeof critiqueRaw?.score === 'number'
            ? critiqueRaw.score
            : typeof critiqueRaw?.overallScore === 'number'
            ? critiqueRaw.overallScore
            : 0,
        keywordCoverage:
          typeof critiqueRaw?.score?.keywordCoverage === 'number'
            ? critiqueRaw.score.keywordCoverage
            : 0,
        semanticFit:
          typeof critiqueRaw?.score?.semanticFit === 'number'
            ? critiqueRaw.score.semanticFit
            : 0,
        metricDensity:
          typeof critiqueRaw?.score?.metricDensity === 'number'
            ? critiqueRaw.score.metricDensity
            : 0,
      },
      issues: Array.isArray(critiqueRaw?.issues)
        ? critiqueRaw.issues
            .map((issue: any) => ({
              experience_id: typeof issue?.experience_id === 'string' ? issue.experience_id : 'unknown',
              bullet_index:
                typeof issue?.bullet_index === 'number'
                  ? issue.bullet_index
                  : typeof issue?.bulletIndex === 'number'
                  ? issue.bulletIndex
                  : -1,
              issueType: issue?.issueType || 'format',
              explanation: issue?.explanation || '',
              suggested_rewrite: typeof issue?.suggested_rewrite === 'string' ? issue.suggested_rewrite : undefined,
            }))
            .filter((issue: CriticIssue) => Boolean(issue.explanation))
        : [],
    };

    return {
      revisedResume,
      critique,
    };
  } catch (error) {
    console.error('❌ Resume critic parse error:', error);
    console.error('Critic raw response snippet:', responseText?.slice(0, 500));

    return {
      revisedResume: normalizedDraft,
      critique: buildFallbackCritique('Critic pass failed to return structured JSON'),
    };
  }
}

