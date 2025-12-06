/**
 * Unified Resume Quality Pass
 * 
 * Merges the Critic and Validator into a single LLM call for speed.
 * Easy to split back if needed - just set USE_MERGED_PASS = false
 * 
 * Critic responsibilities:
 * - ACR rubric enforcement (Action-Context-Result)
 * - Bullet rewrites for quality
 * - Duplicate/redundant bullet removal
 * - Bullet count enforcement per experience
 * - Summary quality check
 * 
 * Validator responsibilities:
 * - JD keyword injection (truthful only)
 * - Skills reordering by JD relevance
 * - Skills prioritization
 * - Final ATS alignment
 */

import { genAI, MAX_BULLETS_PER_ROLE } from './gemini';
import {
  normalizeResumeContent,
  type ResumeContent,
  formatResumeForAts,
} from './resume-content';
import type { ParsedJobDescription } from './rag/job-types';

// Toggle to easily switch back to separate passes
export const USE_MERGED_PASS = true;

const QUALITY_PASS_JOB_DESC_LIMIT = 6000;
const DEFAULT_KEYWORD_INJECTION_LIMIT = 12;

// ============================================================================
// Types for AI Change Tracking
// ============================================================================

export type AIChangeType = 
  | 'bullet_rewritten'
  | 'bullet_added'
  | 'bullet_removed'
  | 'summary_enhanced'
  | 'skill_added'
  | 'skill_removed'
  | 'skill_reordered'
  | 'keyword_injected';

export type AIChange = {
  type: AIChangeType;
  section: 'summary' | 'experience' | 'skills' | 'education' | 'certifications';
  description: string;
  original?: string;
  revised?: string;
  experienceIndex?: number;
  bulletIndex?: number;
  keywords?: string[];
};

export type QualityPassMetadata = {
  // Scoring
  score: {
    overall: number;
    keywordCoverage: number;
    semanticFit: number;
    metricDensity: number;
  };
  // AI changes for user visibility
  aiChanges: AIChange[];
  // Summary stats
  summaryChanged: boolean;
  skillsChanged: boolean;
  skillsReordered: boolean;
  bulletsRewritten: number;
  jdKeywordsAdded: string[];
  jdKeywordsMissing: string[];
  // Issues found (from critic)
  issues: Array<{
    experienceIndex: number;
    bulletIndex: number;
    issueType: string;
    explanation: string;
  }>;
};

export type QualityPassResult = {
  refinedResume: ResumeContent;
  metadata: QualityPassMetadata;
};

// ============================================================================
// Helper Functions
// ============================================================================

const normalizeKeyword = (keyword?: string | null) =>
  (keyword || '').trim().toLowerCase();

const generateVariantsForMatch = (value: string): string[] => {
  const raw = (value || '').trim();
  if (!raw) return [];

  const variants = new Set<string>();

  const normalize = (str: string) =>
    str
      .toLowerCase()
      .replace(/[\u2010-\u2015]/g, '-') // normalize hyphens
      .replace(/[^a-z0-9\s-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const base = normalize(raw);
  if (base) variants.add(base);

  // hyphen <-> space swap
  if (base.includes('-')) variants.add(base.replace(/-/g, ' '));
  if (base.includes(' ')) variants.add(base.replace(/\s+/g, '-'));

  // simple singular/plural
  // simple singular/plural (avoid acronyms and irregular cases)
  if (base.length > 3 && base.endsWith('s') && !base.endsWith('ss')) {
    variants.add(base.slice(0, -1));
  }
  if (base.length > 2 && !base.endsWith('s')) {
    variants.add(`${base}s`);
  }

  return Array.from(variants).filter(Boolean);
};

const uniqueStrings = (values: (string | null | undefined)[] = []) => {
  const seen = new Set<string>();
  return values
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value && value.length > 0))
    .filter((value) => {
      const lower = value.toLowerCase();
      if (seen.has(lower)) return false;
      seen.add(lower);
      return true;
    });
};

const analyzeKeywordCoverage = (
  resume: ResumeContent,
  keywords: string[]
): { present: string[]; missing: string[] } => {
  if (!keywords?.length) {
    return { present: [], missing: [] };
  }

  const resumeText = formatResumeForAts(resume).toLowerCase();
  const present: string[] = [];
  const missing: string[] = [];

  keywords.forEach((keyword) => {
    const variants = generateVariantsForMatch(keyword);
    const hit = variants.some((variant) => variant && resumeText.includes(variant));
    if (hit) {
      present.push(keyword);
    } else {
      missing.push(keyword);
    }
  });

  return { present, missing };
};

const reorderSkillsForJob = (
  skills: string[] | undefined,
  jobKeywords: string[]
): string[] | undefined => {
  if (!skills || skills.length === 0 || !jobKeywords?.length) {
    return skills;
  }

  const jobKeywordSet = new Set(jobKeywords.map((kw) => normalizeKeyword(kw)));
  const seen = new Set<string>();
  const prioritized: string[] = [];
  const remaining: string[] = [];

  skills.forEach((skill) => {
    const normalized = normalizeKeyword(skill);
    if (seen.has(normalized)) {
      return;
    }
    seen.add(normalized);
    if (jobKeywordSet.has(normalized)) {
      prioritized.push(skill);
    } else {
      remaining.push(skill);
    }
  });

  return [...prioritized, ...remaining];
};

function countBullets(resume: ResumeContent): number {
  return (resume.experience || []).reduce((sum, exp) => {
    const bullets = Array.isArray(exp?.bullets) ? exp.bullets.length : 0;
    return sum + bullets;
  }, 0);
}

// ============================================================================
// Main Quality Pass Function
// ============================================================================

export async function runQualityPass({
  resumeDraft,
  jobDescription,
  parsedJob,
  jobKeywords = [],
  candidateSkillUniverse = [],
  maxBulletsPerExperience = MAX_BULLETS_PER_ROLE,
  keywordInjectionLimit = DEFAULT_KEYWORD_INJECTION_LIMIT,
}: {
  resumeDraft: ResumeContent;
  jobDescription: string;
  parsedJob?: ParsedJobDescription;
  jobKeywords?: string[];
  candidateSkillUniverse?: string[];
  maxBulletsPerExperience?: number;
  keywordInjectionLimit?: number;
}): Promise<QualityPassResult> {
  if (!genAI) {
    throw new Error('Gemini API key not configured');
  }

  const normalizedDraft = normalizeResumeContent(resumeDraft);
  const truncatedJobDescription = (jobDescription || '').trim().slice(0, QUALITY_PASS_JOB_DESC_LIMIT);

  // Build keyword guidance with synonym-aware truth checking
  const normalizedCandidateSkills = uniqueStrings(candidateSkillUniverse);
  const candidateVariantSet = new Set(
    normalizedCandidateSkills.flatMap((skill) => generateVariantsForMatch(skill))
  );

  const truthfulKeywords = uniqueStrings(jobKeywords).filter((keyword) => {
    const variants = generateVariantsForMatch(keyword);
    if (candidateVariantSet.size === 0) {
      const coverage = analyzeKeywordCoverage(normalizedDraft, [keyword]);
      return coverage.present.length > 0;
    }
    return variants.some((variant) => candidateVariantSet.has(variant));
  });

  const coverageBefore = analyzeKeywordCoverage(normalizedDraft, truthfulKeywords);
  const prioritizedMissingKeywords = coverageBefore.missing.slice(0, keywordInjectionLimit);

  // 🔍 Quality pass context (REMOVE IN PRODUCTION)
  console.log('🎯 Quality pass context (REMOVE IN PRODUCTION):', {
    experienceCount: normalizedDraft.experience?.length || 0,
    bulletCount: countBullets(normalizedDraft),
    maxBulletsPerExperience,
    truthfulKeywords: truthfulKeywords.length,
    prioritizedMissing: prioritizedMissingKeywords.length,
  });

  const prioritizedKeywordList = prioritizedMissingKeywords.length
    ? prioritizedMissingKeywords.map((kw, i) => `${i + 1}. ${kw}`).join('\n')
    : 'None (all verified JD keywords already covered).';

  const verifiedSkillPoolPreview = uniqueStrings(candidateSkillUniverse)
    .slice(0, 60)
    .join(', ') || 'Not provided';

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.15,
      topP: 0.85,
    },
  });

  const prompt = `You are an expert resume quality analyst combining ACR rubric enforcement with JD alignment optimization.

Job Description (truncated to ${QUALITY_PASS_JOB_DESC_LIMIT} chars):
${truncatedJobDescription || 'Not provided'}

Parsed JD Context:
- Title: ${parsedJob?.normalizedTitle || 'n/a'}
- Level: ${parsedJob?.level || 'IC'}
- Domain: ${parsedJob?.domain || 'general'}
- Responsibilities: ${parsedJob?.responsibilities?.slice(0, 8).join('; ') || 'n/a'}
- Hard Skills (MUST prioritize): ${parsedJob?.hardSkills?.slice(0, 40).join(', ') || 'n/a'}
- Soft Skills: ${parsedJob?.softSkills?.slice(0, 15).join(', ') || 'n/a'}
- Key Phrases: ${parsedJob?.keyPhrases?.slice(0, 15).join(', ') || 'n/a'}

Verified Skill Pool (truth guard - do NOT go outside this set):
${verifiedSkillPoolPreview}

JD Keywords to Inject (only if truthful):
${prioritizedKeywordList}

Current Resume JSON:
${JSON.stringify(normalizedDraft, null, 2)}

=== TASK 1: Quality Critique (ACR Rubric) ===

Score every bullet 1-5 on:
1. Action: Forceful verb, clear ownership
2. Context: Scope, product, team, constraints
3. Result: Quantified impact, measurable outcomes
4. Relevance: Alignment to JD needs

Rules:
- Rewrite bullets scoring <3 using ACR rubric while staying truthful
- Remove duplicate/overlapping bullets, keep best phrasing
- Enforce max ${maxBulletsPerExperience} bullets per experience
- Strip ALL placeholder text ("Company Name", "N/A", "TBD", etc.)
- Keep company/title/location/dates exactly as provided
- Never reorder experiences

=== TASK 2: JD Alignment Optimization ===

1. **Summary**: 3-4 sentences (min 350 chars) that tell a compelling career narrative:
   - Open with years of experience and primary domain expertise
   - Highlight 1-2 key achievements that demonstrate impact (metrics optional, only if compelling)
   - Mention 2-3 tools/skills that directly match JD requirements
   - Close by connecting background to the target role's core needs
   - AVOID: Generic metric-stuffing like "Analyzed 100+ reports" - focus on real impact and relevance

2. **Skills**:
   - Order by JD relevance, remove unrelated items, and include JD phrases only when they are supported by the candidate's verified history.
   - Add a JD skill only if it is truthful based on candidate data and materially improves alignment.

3. **Bullets (JD alignment without forcing it)**:
   - Incorporate JD keywords naturally when they are already supported by the candidate's verified achievements.
   - Consider rewriting or replacing a bullet, or adding a new bullet (when under the max per experience), **only if** it clearly improves JD match while staying 100% truthful. If alignment is weak or would require invention, do not force it.
   - Keep ≤ ${maxBulletsPerExperience} bullets per experience; prefer replacing weaker bullets over exceeding the limit.

=== TASK 3: Track AI Changes ===

For EVERY change you make, record it in the aiChanges array so users can see what AI modified:
- bullet_rewritten: When you rewrite a bullet for quality/clarity
- summary_enhanced: When you improve the summary
- skill_added/skill_removed: When you add or remove skills
- keyword_injected: When you add JD keywords to bullets

Return JSON ONLY:
{
  "revisedResume": {
    "contactInfo": {...},
    "summary": "...",
    "experience": [
      {
        "company": "...",
        "title": "...",
        "location": "...",
        "startDate": "...",
        "endDate": "...",
        "bullets": ["..."]
      }
    ],
    "skills": ["..."],
    "education": [...],
    "certifications": [...]
  },
  "metadata": {
    "score": {
      "overall": 0-100,
      "keywordCoverage": 0-100,
      "semanticFit": 0-100,
      "metricDensity": 0-100
    },
    "aiChanges": [
      {
        "type": "bullet_rewritten|summary_enhanced|skill_added|keyword_injected|etc",
        "section": "summary|experience|skills",
        "description": "Brief description of change",
        "original": "original text (if applicable)",
        "revised": "new text (if applicable)",
        "experienceIndex": 0,
        "bulletIndex": 0,
        "keywords": ["added", "keywords"]
      }
    ],
    "issues": [
      {
        "experienceIndex": 0,
        "bulletIndex": 0,
        "issueType": "too_generic|missing_metric|jd_gap|redundant",
        "explanation": "..."
      }
    ]
  }
}`;

  const startTime = Date.now();
  const result = await model.generateContent(prompt);
  const responseText = result.response.text();
  const llmTime = Date.now() - startTime;

  console.log(`✅ Quality pass LLM completed in ${llmTime}ms`);

  try {
    const parsed = JSON.parse(responseText);
    let refinedResume = normalizeResumeContent(parsed?.revisedResume || parsed?.resume || {});

    // Post-process: enforce skill ordering
    let systemSkillsReordered = false;
    const reorderedSkills = reorderSkillsForJob(refinedResume.skills, jobKeywords);
    if (
      reorderedSkills &&
      JSON.stringify(reorderedSkills) !== JSON.stringify(refinedResume.skills || [])
    ) {
      refinedResume = { ...refinedResume, skills: reorderedSkills };
      systemSkillsReordered = true;
    }

    // Extract metadata from LLM response
    const rawMetadata = parsed?.metadata || {};
    const aiChanges: AIChange[] = Array.isArray(rawMetadata?.aiChanges)
      ? rawMetadata.aiChanges.map((change: any) => ({
          type: change.type || 'bullet_rewritten',
          section: change.section || 'experience',
          description: change.description || '',
          original: change.original,
          revised: change.revised,
          experienceIndex: change.experienceIndex,
          bulletIndex: change.bulletIndex,
          keywords: change.keywords,
        }))
      : [];

    // Compute diff-based changes if LLM didn't provide them
    if (aiChanges.length === 0) {
      // Summary change
      if (refinedResume.summary !== normalizedDraft.summary) {
        aiChanges.push({
          type: 'summary_enhanced',
          section: 'summary',
          description: 'Summary enhanced for JD alignment',
          original: normalizedDraft.summary?.substring(0, 150),
          revised: refinedResume.summary?.substring(0, 150),
        });
      }

      // Skills changes
      const originalSkills = new Set(normalizedDraft.skills || []);
      const refinedSkills = new Set(refinedResume.skills || []);
      
      (refinedResume.skills || []).forEach((skill) => {
        if (!originalSkills.has(skill)) {
          aiChanges.push({
            type: 'skill_added',
            section: 'skills',
            description: `Added skill: ${skill}`,
            revised: skill,
          });
        }
      });

      // Bullet changes
      const originalExperiences = normalizedDraft.experience || [];
      const refinedExperiences = refinedResume.experience || [];

      refinedExperiences.forEach((refinedExp, expIndex) => {
        const originalExp = originalExperiences[expIndex];
        if (!originalExp) return;

        const originalBullets = originalExp.bullets || [];
        const refinedBullets = refinedExp.bullets || [];

        refinedBullets.forEach((refinedBullet, bulletIndex) => {
          const originalBullet = originalBullets[bulletIndex];
          if (originalBullet && originalBullet !== refinedBullet) {
            aiChanges.push({
              type: 'bullet_rewritten',
              section: 'experience',
              description: `Bullet rewritten for ${refinedExp.company || 'experience'}`,
              original: originalBullet,
              revised: refinedBullet,
              experienceIndex: expIndex,
              bulletIndex,
            });
          }
        });
      });
    }

    // Compute keyword coverage
    const coverageAfter = analyzeKeywordCoverage(refinedResume, truthfulKeywords);
    const jdKeywordsAdded = coverageAfter.present.filter(
      (keyword) => !coverageBefore.present.includes(keyword)
    );

    const metadata: QualityPassMetadata = {
      score: {
        overall: rawMetadata?.score?.overall || 0,
        keywordCoverage: rawMetadata?.score?.keywordCoverage || 0,
        semanticFit: rawMetadata?.score?.semanticFit || 0,
        metricDensity: rawMetadata?.score?.metricDensity || 0,
      },
      aiChanges,
      summaryChanged: refinedResume.summary !== normalizedDraft.summary,
      skillsChanged: JSON.stringify(refinedResume.skills) !== JSON.stringify(normalizedDraft.skills),
      skillsReordered: systemSkillsReordered,
      bulletsRewritten: aiChanges.filter((c) => c.type === 'bullet_rewritten').length,
      jdKeywordsAdded: jdKeywordsAdded.slice(0, 20),
      jdKeywordsMissing: coverageAfter.missing.slice(0, 20),
      issues: Array.isArray(rawMetadata?.issues) ? rawMetadata.issues : [],
    };

    console.log('✅ Quality pass completed:', {
      aiChangesCount: aiChanges.length,
      summaryChanged: metadata.summaryChanged,
      skillsChanged: metadata.skillsChanged,
      bulletsRewritten: metadata.bulletsRewritten,
      jdKeywordsAdded: jdKeywordsAdded.length,
    });

    return { refinedResume, metadata };
  } catch (error: any) {
    console.error('❌ Quality pass parse error:', error.message);
    console.error('Raw response snippet:', responseText?.slice(0, 500));

    // Return original with empty metadata on failure
    return {
      refinedResume: normalizedDraft,
      metadata: {
        score: { overall: 0, keywordCoverage: 0, semanticFit: 0, metricDensity: 0 },
        aiChanges: [],
        summaryChanged: false,
        skillsChanged: false,
        skillsReordered: false,
        bulletsRewritten: 0,
        jdKeywordsAdded: [],
        jdKeywordsMissing: [],
        issues: [],
      },
    };
  }
}

