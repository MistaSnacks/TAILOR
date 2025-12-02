import { genAI } from './gemini';
import {
  normalizeResumeContent,
  type ResumeContent,
  formatResumeForAts,
} from './resume-content';
import type { ParsedJobDescription } from './rag/job-types';

const VALIDATOR_JOB_DESC_LIMIT = 6000;
const DEFAULT_KEYWORD_INJECTION_LIMIT = 12;

type KeywordCoverage = {
  present: string[];
  missing: string[];
};

type KeywordGuidance = {
  truthfulKeywords: string[];
  prioritizedMissingKeywords: string[];
  coverageBefore: KeywordCoverage;
};

const normalizeKeyword = (keyword?: string | null) =>
  (keyword || '').trim().toLowerCase();

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
): KeywordCoverage => {
  if (!keywords?.length) {
    return { present: [], missing: [] };
  }

  const resumeText = formatResumeForAts(resume).toLowerCase();
  const present: string[] = [];
  const missing: string[] = [];

  keywords.forEach((keyword) => {
    const normalized = normalizeKeyword(keyword);
    if (!normalized) return;
    if (resumeText.includes(normalized)) {
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

const buildKeywordGuidance = ({
  resume,
  jobKeywords = [],
  candidateSkillUniverse = [],
  keywordInjectionLimit = DEFAULT_KEYWORD_INJECTION_LIMIT,
}: {
  resume: ResumeContent;
  jobKeywords?: string[];
  candidateSkillUniverse?: string[];
  keywordInjectionLimit?: number;
}): KeywordGuidance => {
  const normalizedCandidateSkills = new Set(
    uniqueStrings(candidateSkillUniverse).map((skill) => skill.toLowerCase())
  );

  // Only allow keywords that the candidate can truthfully claim
  const truthfulKeywords = uniqueStrings(jobKeywords).filter((keyword) => {
    if (normalizedCandidateSkills.size === 0) {
      // No verified skills provided; default to requiring keyword to already exist in resume
      const coverage = analyzeKeywordCoverage(resume, [keyword]);
      return coverage.present.length > 0;
    }
    return normalizedCandidateSkills.has(keyword.toLowerCase());
  });

  const coverageBefore = analyzeKeywordCoverage(resume, truthfulKeywords);
  const prioritizedMissingKeywords = coverageBefore.missing.slice(
    0,
    keywordInjectionLimit
  );

  return {
    truthfulKeywords,
    prioritizedMissingKeywords,
    coverageBefore,
  };
};

export type ValidatorChange = {
  section: 'summary' | 'skills' | 'experience' | 'education' | 'certifications';
  type: 'added' | 'removed' | 'modified' | 'reordered';
  description: string;
  before?: string;
  after?: string;
  experienceIndex?: number;
  bulletIndex?: number;
};

export type ValidatorMetadata = {
  changes: ValidatorChange[];
  summaryChanged: boolean;
  skillsChanged: boolean;
  skillsReordered: boolean;
  experienceBulletsChanged: number;
  jdKeywordsAdded: string[];
  jdKeywordsMissing: string[];
};

export type ValidatorResult = {
  refinedResume: ResumeContent;
  metadata: ValidatorMetadata;
};

/**
 * Micro-agent that validates and refines the entire resume against the job description
 * This is a final pass that ensures:
 * - Summary and skills align with JD priorities
 * - All sections are optimized for ATS matching
 * - Missing keywords are incorporated where truthful
 * - Formatting and consistency are maintained
 */
export async function validateAndRefineResume({
  resumeDraft,
  jobDescription,
  parsedJob,
  jobKeywords = [],
  candidateSkillUniverse = [],
  keywordInjectionLimit = DEFAULT_KEYWORD_INJECTION_LIMIT,
}: {
  resumeDraft: ResumeContent;
  jobDescription: string;
  parsedJob?: ParsedJobDescription;
  jobKeywords?: string[];
  candidateSkillUniverse?: string[];
  keywordInjectionLimit?: number;
}): Promise<ValidatorResult> {
  if (!genAI) {
    console.warn('⚠️ Gemini API key not configured, skipping validator');
    return {
      refinedResume: resumeDraft,
      metadata: {
        changes: [],
        summaryChanged: false,
        skillsChanged: false,
        skillsReordered: false,
        experienceBulletsChanged: 0,
        jdKeywordsAdded: [],
        jdKeywordsMissing: [],
      },
    };
  }

  const normalizedDraft = normalizeResumeContent(resumeDraft);
  const truncatedJobDescription = (jobDescription || '')
    .trim()
    .slice(0, VALIDATOR_JOB_DESC_LIMIT);
  const keywordGuidance = buildKeywordGuidance({
    resume: normalizedDraft,
    jobKeywords,
    candidateSkillUniverse,
    keywordInjectionLimit,
  });
  console.log('🧮 Validator keyword guidance initialized:', {
    truthfulKeywords: keywordGuidance.truthfulKeywords.length,
    prioritizedMissing: keywordGuidance.prioritizedMissingKeywords.length,
    coveragePresent: keywordGuidance.coverageBefore.present.length,
    coverageMissing: keywordGuidance.coverageBefore.missing.length,
    sampleTruthful: keywordGuidance.truthfulKeywords.slice(0, 10),
    samplePrioritized: keywordGuidance.prioritizedMissingKeywords.slice(0, 10),
  });
  const prioritizedKeywordList = keywordGuidance.prioritizedMissingKeywords.length
    ? keywordGuidance.prioritizedMissingKeywords
        .map((keyword, index) => `${index + 1}. ${keyword}`)
        .join('\n')
    : 'None (all verified JD keywords already covered).';
  const verifiedSkillPoolPreview = uniqueStrings(candidateSkillUniverse)
    .slice(0, 60)
    .join(', ') || 'Not provided (will not add new keywords)';

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.1, // Lower temperature for more consistent refinement
      topP: 0.9,
    },
  });

  const prompt = `You are a resume refinement specialist. Perform a final validation and optimization pass on this resume against the target job description.

Job Description (truncated to ${VALIDATOR_JOB_DESC_LIMIT} chars):
${truncatedJobDescription || 'Not provided'}

Parsed JD Context:
- Normalized Title: ${parsedJob?.normalizedTitle || 'n/a'}
- Level: ${parsedJob?.level || 'IC'}
- Domain: ${parsedJob?.domain || 'general'}
- Responsibilities: ${parsedJob?.responsibilities?.slice(0, 8).join('; ') || 'n/a'}
- Hard Skills (MUST prioritize): ${parsedJob?.hardSkills?.slice(0, 40).join(', ') || 'n/a'}
- Soft Skills: ${parsedJob?.softSkills?.slice(0, 15).join(', ') || 'n/a'}
- Key Phrases: ${parsedJob?.keyPhrases?.slice(0, 15).join(', ') || 'n/a'}

Verified Skill Pool (truth guard - do NOT go outside this set):
${verifiedSkillPoolPreview}

JD Keyword Guidance (truth-first):
- Only inject keywords from this approved list if they are already supported by the candidate's verified history.
- Approved & prioritized keywords (max ${keywordInjectionLimit}):
${prioritizedKeywordList}
- If a keyword cannot be grounded in a real achievement or skill, leave it out.

Current Resume JSON:
${JSON.stringify(normalizedDraft, null, 2)}

Your task is to refine this resume to maximize ATS compatibility and JD alignment:

1. **Summary Section:**
   - Ensure it mentions 2-3 of the most important hard skills from the JD
   - Include key phrases from the JD where truthful
   - Highlight domain expertise that matches the JD domain
   - Maintain 3-4 sentences (minimum 350 characters)
   - Use exact JD terminology when possible (e.g., if JD says "trust & safety", use that phrase)

2. **Skills Section:**
   - Prioritize skills that appear in the JD's hard skills list
   - Ensure all JD-required tools/platforms are included if the candidate has them
   - Order skills by relevance to JD (most relevant first)
   - Remove any skills that don't relate to the JD
   - Include multi-word phrases from JD when appropriate (e.g., "Data Visualization", "Process Improvement")

3. **Experience Bullets:**
   - Ensure bullets mention JD-relevant tools, technologies, and methodologies
   - Incorporate JD key phrases naturally where they match the candidate's work
   - Prioritize bullets that demonstrate JD-relevant skills
   - Ensure each bullet follows Action-Context-Result format
   - Maintain metrics and quantifiable results

4. **Overall:**
   - Preserve ALL verified facts (companies, titles, dates, metrics)
   - Never invent new companies, projects, or achievements
   - Maintain chronological order
   - Ensure consistency in formatting
   - Remove any placeholder text
   - Keep the same structure and section order

Return the refined resume JSON in the exact same structure as the input. Only make changes that improve JD alignment while staying truthful to the candidate's actual experience.

Return JSON ONLY:
{
  "summary": "...",
  "experience": [...],
  "skills": [...],
  "education": [...],
  "certifications": [...],
  "contact": {...}
}`;

  try {
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    const parsed = JSON.parse(responseText);
    const rawRefinedResume = parsed?.refinedResume || parsed;
    let refinedResume = normalizeResumeContent(rawRefinedResume);

    // Enforce deterministic skill ordering for ATS weighting
    let systemSkillsReordered = false;
    const reorderedSkills = reorderSkillsForJob(refinedResume.skills, jobKeywords);
    if (
      reorderedSkills &&
      JSON.stringify(reorderedSkills) !== JSON.stringify(refinedResume.skills || [])
    ) {
      refinedResume = {
        ...refinedResume,
        skills: reorderedSkills,
      };
      systemSkillsReordered = true;
    }

    // Track changes
    const changes: ValidatorChange[] = [];

    // Check summary changes
    const summaryChanged = refinedResume.summary !== normalizedDraft.summary;
    if (summaryChanged) {
      changes.push({
        section: 'summary',
        type: 'modified',
        description: 'Summary refined to better align with JD priorities and key phrases',
        before: normalizedDraft.summary?.substring(0, 200),
        after: refinedResume.summary?.substring(0, 200),
      });
    }

    // Check skills changes
    const originalSkills = normalizedDraft.skills || [];
    const refinedSkills = refinedResume.skills || [];
    const skillsChanged =
      JSON.stringify(originalSkills) !== JSON.stringify(refinedSkills);

    let skillsReordered = false;
    const addedSkills: string[] = [];
    const removedSkills: string[] = [];

    if (skillsChanged) {
      // Check if reordered (same skills, different order)
      const originalSet = new Set(originalSkills);
      const refinedSet = new Set(refinedSkills);
      const sameSkills =
        originalSet.size === refinedSet.size &&
        [...originalSet].every((skill) => refinedSet.has(skill));

      if (sameSkills) {
        skillsReordered = true;
        changes.push({
          section: 'skills',
          type: 'reordered',
          description: `Skills reordered by JD relevance (${refinedSkills.length} skills)`,
        });
      } else {
        // Find added/removed skills
        refinedSkills.forEach((skill) => {
          if (!originalSet.has(skill)) {
            addedSkills.push(skill);
          }
        });
        originalSkills.forEach((skill) => {
          if (!refinedSet.has(skill)) {
            removedSkills.push(skill);
          }
        });

        if (addedSkills.length > 0) {
          changes.push({
            section: 'skills',
            type: 'added',
            description: `Added ${addedSkills.length} JD-relevant skill(s)`,
            after: addedSkills.join(', '),
          });
        }

        if (removedSkills.length > 0) {
          changes.push({
            section: 'skills',
            type: 'removed',
            description: `Removed ${removedSkills.length} less relevant skill(s)`,
            before: removedSkills.join(', '),
          });
        }
      }
    }

    // Check experience bullet changes
    let experienceBulletsChanged = 0;
    const originalExperiences = normalizedDraft.experience || [];
    const refinedExperiences = refinedResume.experience || [];

    originalExperiences.forEach((originalExp, expIndex) => {
      const refinedExp = refinedExperiences[expIndex];
      if (!refinedExp) return;

      const originalBullets = originalExp.bullets || [];
      const refinedBullets = refinedExp.bullets || [];

      if (JSON.stringify(originalBullets) !== JSON.stringify(refinedBullets)) {
        experienceBulletsChanged += refinedBullets.length;

        refinedBullets.forEach((refinedBullet, bulletIndex) => {
          const originalBullet = originalBullets[bulletIndex];
          if (originalBullet && originalBullet !== refinedBullet) {
            changes.push({
              section: 'experience',
              type: 'modified',
              description: 'Bullet refined to incorporate JD terminology',
              experienceIndex: expIndex,
              bulletIndex,
              before: originalBullet.substring(0, 100),
              after: refinedBullet.substring(0, 100),
            });
          }
        });
      }
    });

    const coverageAfter = analyzeKeywordCoverage(
      refinedResume,
      keywordGuidance.truthfulKeywords
    );
    const jdKeywordsAdded = coverageAfter.present.filter(
      (keyword) => !keywordGuidance.coverageBefore.present.includes(keyword)
    );
    const jdKeywordsMissing = coverageAfter.missing;

    const metadata: ValidatorMetadata = {
      changes,
      summaryChanged,
      skillsChanged,
      skillsReordered: skillsReordered || systemSkillsReordered,
      experienceBulletsChanged,
      jdKeywordsAdded: jdKeywordsAdded.slice(0, 20),
      jdKeywordsMissing: jdKeywordsMissing.slice(0, 20),
    };

    console.log('✅ Resume validator completed:', {
      summaryChanged,
      skillsChanged,
      skillsReordered: metadata.skillsReordered,
      systemSkillsReordered,
      experienceBulletsChanged,
      changesCount: changes.length,
      jdKeywordsAdded: jdKeywordsAdded.length,
      jdKeywordsMissing: jdKeywordsMissing.length,
    });

    return {
      refinedResume,
      metadata,
    };
  } catch (error: any) {
    console.error('❌ Resume validator error:', error.message);
    if (error.stack) {
      console.error('Validator error stack:', error.stack.split('\n').slice(0, 3).join('\n'));
    }
    // Return original draft if validator fails
    return {
      refinedResume: normalizedDraft,
      metadata: {
        changes: [],
        summaryChanged: false,
        skillsChanged: false,
        skillsReordered: false,
        experienceBulletsChanged: 0,
        jdKeywordsAdded: [],
        jdKeywordsMissing: [],
      },
    };
  }
}

