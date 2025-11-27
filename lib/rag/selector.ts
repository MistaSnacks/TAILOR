import type { RetrievedProfile, RetrievedExperience, RetrievedSkill, RetrievedBullet } from './retriever';
import type { ParsedJobDescription } from './parser';
import type { WriterExperience, WriterBulletCandidate } from './selection-types';
import {
  filterEligibleExperiences,
  type FilteredExperience,
  type ResumeExperience,
} from '../resume-content';

export type TargetJobContext = {
  description: string;
  title?: string;
  requiredSkills?: string[];
};

export type JobSelectionSignals = {
  parsedJob: ParsedJobDescription;
  jobEmbedding: number[];
  queryEmbeddings: number[][];
};

export type SelectionOptions = {
  maxExperiences?: number;
  minScore?: number;
  maxWriterExperiences?: number;
};

export type ScoreSignals = {
  bulletScore: number;
  keywordScore: number;
  recencyScore: number;
  metricDensity: number;
};

export type TargetedBullet = {
  id: string;
  experienceId: string;
  text: string;
  score: number;
  similarity: number;
  hasMetric: boolean;
  toolMatches: string[];
  sourceIds: string[];
};

type PreparedExperience = ResumeExperience & {
  relevance_score: number;
  relevance_signals: ScoreSignals;
};

export type TargetedExperience = {
  id?: string;
  experience: ResumeExperience;
  original?: RetrievedExperience;
  prepared: PreparedExperience;
  bulletBudget: number;
  bulletCandidates: TargetedBullet[];
  selectedBullets: TargetedBullet[];
  writerContext: WriterExperience;
  score: number;
  signals: ScoreSignals;
};

export type SelectionDiagnostics = {
  totalExperiences: number;
  eligibleExperiences: number;
  filteredExperiences: Array<{
    id?: string;
    title?: string;
    company?: string;
    reasons: string[];
  }>;
  warnings: string[];
  jobKeywordSample: string[];
  scoringSummary: Array<{
    experienceId?: string;
    score: number;
    bulletBudget: number;
    selectedBullets: number;
    signals: ScoreSignals;
  }>;
};

export type TargetAwareProfile = {
  experiences: TargetedExperience[];
  bullets: TargetedBullet[];
  skills: RetrievedSkill[];
  writerExperiences: WriterExperience[];
  diagnostics: SelectionDiagnostics;
  parsedJob: ParsedJobDescription;
};

export function selectTargetAwareProfile(
  profile: RetrievedProfile,
  job: TargetJobContext,
  signals: JobSelectionSignals,
  options: SelectionOptions = {}
): TargetAwareProfile {
  const maxExperiences = options.maxExperiences ?? 4;
  const minScore = options.minScore ?? 0.35;
  const maxWriterExperiences = options.maxWriterExperiences ?? maxExperiences;

  const canonicalExperiences = Array.isArray(profile.experiences) ? profile.experiences : [];
  const experienceOrder = buildExperienceOrder(canonicalExperiences);

  const validationInput = canonicalExperiences.map((experience) => ({
    id: experience.id,
    title: experience.title,
    company: experience.company,
    location: experience.location,
    startDate: experience.startDate,
    endDate: experience.endDate,
    isCurrent: experience.isCurrent,
    bullets: experience.bullets?.map((bullet) => bullet.text) ?? [],
  }));

  const experienceValidation = filterEligibleExperiences(validationInput as any);
  const experienceMap = new Map<string, RetrievedExperience>();
  canonicalExperiences.forEach((experience) => {
    experienceMap.set(experience.id, experience);
  });

  const jobKeywords = buildJobKeywords(job, signals.parsedJob);

  const scoredExperiences = experienceValidation.eligible.map((experience) => {
    const raw = experience.id ? experienceMap.get(experience.id) : undefined;
    const rawBullets = raw?.bullets || [];
    
    // 🔍 Debug logging (REMOVE IN PRODUCTION)
    if (!rawBullets.length && raw) {
      console.warn('⚠️ Experience has no bullets:', {
        experienceId: experience.id,
        company: experience.company,
        title: experience.title,
      });
    }
    
    const bulletCandidates = scoreBullets(rawBullets, signals);
    const bulletBudget = determineBulletBudget(experienceOrder.get(experience.id || '') ?? canonicalExperiences.length, raw);
    const selectedBullets = bulletCandidates.slice(0, bulletBudget);

    const bulletScore = computeBulletScore(selectedBullets);
    const keywordScore = computeKeywordScore(experience, selectedBullets, jobKeywords.slice(0, 40));
    const recencyScore = computeRecencyScore(experience);
    const metricDensity = selectedBullets.length
      ? clamp(selectedBullets.filter((bullet) => bullet.hasMetric).length / selectedBullets.length)
      : 0;

    const scoreSignals: ScoreSignals = {
      bulletScore,
      keywordScore,
      recencyScore,
      metricDensity,
    };

    const score = clamp(
      bulletScore * 0.55 + keywordScore * 0.2 + recencyScore * 0.2 + metricDensity * 0.05
    );

    const prepared: PreparedExperience = {
      ...experience,
      relevance_score: Number(score.toFixed(3)),
      relevance_signals: scoreSignals,
    };

    const writerContext = buildWriterContext(prepared, bulletBudget, bulletCandidates);

    return {
      id: prepared.id,
      experience,
      original: raw,
      prepared,
      bulletBudget,
      bulletCandidates,
      selectedBullets,
      writerContext,
      score,
      signals: scoreSignals,
    };
  });

  const sorted = scoredExperiences.sort((a, b) => b.score - a.score);
  
  // First, get experiences meeting the minimum score threshold
  let selected = sorted.filter((entry) => entry.score >= minScore).slice(0, maxExperiences);

  // If we have fewer than maxExperiences, include lower-scoring ones too
  // This ensures we don't produce a "thin" resume when semantic match is low
  if (selected.length < maxExperiences && sorted.length > selected.length) {
    const remaining = sorted
      .filter((entry) => entry.score < minScore)
      .slice(0, maxExperiences - selected.length);
    selected = [...selected, ...remaining];
    
    if (remaining.length > 0) {
      console.log(`📊 Added ${remaining.length} below-threshold experiences to reach ${selected.length} total`);
    }
  }

  if (selected.length === 0 && sorted.length > 0) {
    selected = sorted.slice(0, Math.min(maxExperiences, sorted.length));
  }

  const prioritizedSkills = prioritizeSkills(profile.skills || [], job.requiredSkills);
  
  // Filter out experiences without bullet candidates before building writer contexts
  const experiencesWithBullets = selected.filter(
    (entry) => entry.bulletCandidates.length > 0
  );
  
  if (experiencesWithBullets.length === 0 && selected.length > 0) {
    console.warn('⚠️ All selected experiences have no bullet candidates:', {
      selectedCount: selected.length,
      experiences: selected.map((entry) => ({
        id: entry.id,
        company: entry.experience.company,
        title: entry.experience.title,
        bulletCandidatesCount: entry.bulletCandidates.length,
        rawBulletsCount: entry.original?.bullets?.length || 0,
        hasOriginal: !!entry.original,
      })),
    });
  }
  
  // 🔍 Additional debug logging (REMOVE IN PRODUCTION)
  console.log('📊 Selection bullet analysis:', {
    totalSelected: selected.length,
    withBullets: experiencesWithBullets.length,
    withoutBullets: selected.length - experiencesWithBullets.length,
    bulletDetails: selected.slice(0, 3).map((entry) => ({
      company: entry.experience.company,
      title: entry.experience.title,
      rawBulletsCount: entry.original?.bullets?.length || 0,
      bulletCandidatesCount: entry.bulletCandidates.length,
      selectedBulletsCount: entry.selectedBullets.length,
      bulletBudget: entry.bulletBudget,
    })),
  });
  
  const writerExperiences = experiencesWithBullets
    .slice(0, maxWriterExperiences)
    .map((entry) => entry.writerContext);
  const flattenedBullets = selected.flatMap((entry) => entry.selectedBullets);

  const diagnostics: SelectionDiagnostics = {
    totalExperiences: canonicalExperiences.length,
    eligibleExperiences: scoredExperiences.length,
    filteredExperiences: mapFiltered(experienceValidation.filtered),
    warnings: [
      ...experienceValidation.warnings,
      ...(selected.length === 0 ? ['No experiences met the minimum relevance threshold'] : []),
    ].filter(Boolean),
    jobKeywordSample: jobKeywords.slice(0, 10),
    scoringSummary: selected.map((entry) => ({
      experienceId: entry.id,
      score: Number(entry.score.toFixed(3)),
      bulletBudget: entry.bulletBudget,
      selectedBullets: entry.selectedBullets.length,
      signals: entry.signals,
    })),
  };

  return {
    experiences: selected,
    bullets: flattenedBullets,
    skills: prioritizedSkills,
    writerExperiences,
    diagnostics,
    parsedJob: signals.parsedJob,
  };
}

function buildExperienceOrder(experiences: RetrievedExperience[]): Map<string, number> {
  const order = new Map<string, number>();
  experiences.forEach((experience, index) => {
    order.set(experience.id, index);
  });
  return order;
}

function scoreBullets(
  bullets: RetrievedBullet[],
  signals: JobSelectionSignals
): TargetedBullet[] {
  if (!bullets || bullets.length === 0) {
    return [];
  }

  const hardSkillSet = new Set(
    (signals.parsedJob.hardSkills || []).map((skill) => skill.toLowerCase())
  );

  // 🔍 Debug logging (REMOVE IN PRODUCTION)
  const bulletsWithoutEmbeddings = bullets.filter((b) => !b.embedding || !b.embedding.length);
  if (bulletsWithoutEmbeddings.length > 0) {
    console.warn(`⚠️ ${bulletsWithoutEmbeddings.length}/${bullets.length} bullets missing embeddings`);
  }

  const scored = bullets
    .map((bullet) => {
      const similarity = computeSemanticSimilarity(bullet, signals);
      const toolMatches = matchHardSkills(bullet.text, hardSkillSet);
      const hasMetric = /[\d%$]/.test(bullet.text);

      const toolBoost = toolMatches.length ? 0.2 : 0;
      const metricBoost = hasMetric ? 0.15 : 0;
      const score = clamp(similarity * 0.65 + toolBoost + metricBoost);

      return {
        id: bullet.id,
        experienceId: bullet.experienceId,
        text: bullet.text,
        score,
        similarity,
        hasMetric,
        toolMatches,
        sourceIds: bullet.sourceIds || [],
      };
    })
    .sort((a, b) => b.score - a.score);

  // 🔍 Debug logging (REMOVE IN PRODUCTION)
  if (scored.length > 0) {
    console.log(`📊 Bullet scoring: ${scored.length} bullets, top score: ${scored[0].score.toFixed(3)}, bottom score: ${scored[scored.length - 1].score.toFixed(3)}`);
  }

  return scored;
}

function computeSemanticSimilarity(
  bullet: RetrievedBullet,
  signals: JobSelectionSignals
): number {
  if (!bullet.embedding || !bullet.embedding.length) {
    return 0;
  }

  const similarities = signals.queryEmbeddings.length
    ? signals.queryEmbeddings.map((embedding) => cosineSimilarity(bullet.embedding as number[], embedding))
    : [cosineSimilarity(bullet.embedding as number[], signals.jobEmbedding)];

  const semanticScore = Math.max(...similarities);
  return clamp(semanticScore);
}

function determineBulletBudget(
  orderIndex: number,
  experience?: RetrievedExperience
): number {
  // More generous bullet budgets to produce fuller resumes
  if (orderIndex <= 1) {
    return 6;  // Most recent: 6 bullets
  }
  if (orderIndex === 2) {
    return 5;  // Second: 5 bullets
  }
  if (orderIndex <= 4) {
    return 4;  // Third/Fourth: 4 bullets
  }

  // Older experiences: base on tenure
  const tenureMonths = experience?.tenureMonths ?? 12;
  if (tenureMonths >= 48) {
    return 4;  // 4+ years: 4 bullets
  }
  if (tenureMonths >= 24) {
    return 3;  // 2-4 years: 3 bullets
  }
  return 2;  // <2 years: 2 bullets
}

function buildWriterContext(
  experience: PreparedExperience,
  bulletBudget: number,
  bulletPool: TargetedBullet[]
): WriterExperience {
  const candidateCount = Math.min(
    bulletPool.length,
    Math.max(bulletBudget * 2, bulletBudget + 2)
  );

  const writerCandidates: WriterBulletCandidate[] = bulletPool.slice(0, candidateCount).map((bullet) => ({
    id: bullet.id,
    text: bullet.text,
    source_ids: bullet.sourceIds,
    score: Number(bullet.score.toFixed(3)),
    has_metric: bullet.hasMetric,
    tool_matches: bullet.toolMatches,
    similarity: Number(bullet.similarity.toFixed(3)),
  }));

  return {
    experience_id: experience.id || '',
    title: experience.title,
    company: experience.company,
    location: experience.location,
    start: experience.startDate,
    end: experience.endDate,
    is_current: experience.isCurrent,
    bullet_budget: bulletBudget,
    bullet_candidates: writerCandidates,
  };
}

function buildJobKeywords(
  job: TargetJobContext,
  parsedJob: ParsedJobDescription
): string[] {
  const keywords: string[] = [];
  const seen = new Set<string>();

  const addKeyword = (keyword: string) => {
    const normalized = keyword.toLowerCase().trim();
    if (normalized && normalized.length >= 2 && !seen.has(normalized)) {
      seen.add(normalized);
      keywords.push(normalized);
    }
  };

  // Add hard skills (now includes multi-word phrases)
  parsedJob.hardSkills?.forEach((skill) => addKeyword(skill));

  // Add soft skills
  parsedJob.softSkills?.forEach((skill) => addKeyword(skill));

  // Add key phrases (multi-word phrases from JD)
  parsedJob.keyPhrases?.forEach((phrase) => addKeyword(phrase));

  // Add responsibilities keywords
  parsedJob.responsibilities?.forEach((resp) => {
    // Keep full phrase for matching
    addKeyword(resp);
    // Also tokenize for individual word matching
    tokenize(resp).forEach(addKeyword);
  });

  // Add title keywords
  if (job.title) {
    tokenize(job.title).forEach(addKeyword);
  }

  if (parsedJob.normalizedTitle) {
    tokenize(parsedJob.normalizedTitle).forEach(addKeyword);
  }

  // Add required skills
  if (Array.isArray(job.requiredSkills)) {
    job.requiredSkills.forEach((skill) => addKeyword(skill));
  }

  // Extract additional n-grams from job description (2-3 word phrases)
  if (job.description) {
    extractKeyPhrases(job.description).forEach(addKeyword);
  }

  return keywords.slice(0, 150); // Increased from 80 to 150
}

// Extract important multi-word phrases from text
function extractKeyPhrases(text: string): string[] {
  const phrases: string[] = [];
  const words = text.toLowerCase().split(/\s+/);

  // Common ATS-relevant phrase patterns
  const phrasePatterns = [
    /\b(cross[- ]functional|data[- ]driven|client[- ]facing|detail[- ]oriented|self[- ]starter)\b/gi,
    /\b(process improvement|stakeholder management|project management|risk management)\b/gi,
    /\b(problem solving|analytical skills|communication skills|organizational skills)\b/gi,
    /\b(high[- ]growth|fast[- ]paced|team collaboration|time management)\b/gi,
    /\b(financial services|billing systems|contract management|account management)\b/gi,
    /\b(attention to detail|customer success|business operations|technical support)\b/gi,
  ];

  phrasePatterns.forEach((pattern) => {
    const matches = text.match(pattern);
    if (matches) {
      matches.forEach((match) => phrases.push(match.toLowerCase()));
    }
  });

  // Extract 2-word phrases that appear multiple times
  for (let i = 0; i < words.length - 1; i++) {
    const bigram = `${words[i]} ${words[i + 1]}`.replace(/[^a-z\s]/g, '').trim();
    if (bigram.length >= 6) {
      phrases.push(bigram);
    }
  }

  return [...new Set(phrases)];
}

function tokenize(
  text: string,
  options: { allowShort?: boolean } = {}
): string[] {
  const minLength = options.allowShort ? 2 : 4;
  return text
    .toLowerCase()
    .split(/[^a-z0-9+#/]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= minLength);
}

function computeBulletScore(bullets: TargetedBullet[]): number {
  if (!bullets.length) return 0;

  const weights = bullets.map((_, index) => Math.max(0.35, 1 - index * 0.1));
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);

  const weightedScore = bullets.reduce((sum, bullet, index) => {
    const similarity = clamp(bullet.score);
    return sum + similarity * weights[index];
  }, 0);

  return clamp(weightedScore / totalWeight);
}

function computeKeywordScore(
  experience: ResumeExperience,
  bullets: TargetedBullet[],
  keywords: string[]
): number {
  if (!keywords.length) return 0;

  const haystack = [
    experience.title,
    experience.company,
    experience.location,
    ...bullets.map((bullet) => bullet.text),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  let hits = 0;
  let totalWeight = 0;

  keywords.forEach((keyword) => {
    if (!keyword) return;

    // Multi-word phrases are worth more (they're more specific)
    const isPhrase = keyword.includes(' ');
    const weight = isPhrase ? 2 : 1;
    totalWeight += weight;

    // Check for exact match
    if (haystack.includes(keyword)) {
      hits += weight;
      return;
    }

    // For single words, also check word boundaries
    if (!isPhrase) {
      const wordBoundaryRegex = new RegExp(`\\b${escapeRegex(keyword)}\\b`, 'i');
      if (wordBoundaryRegex.test(haystack)) {
        hits += weight;
        return;
      }
    }

    // For phrases, check if all words are present (even if not adjacent)
    if (isPhrase) {
      const words = keyword.split(/\s+/);
      const allWordsPresent = words.every((word) => haystack.includes(word));
      if (allWordsPresent) {
        hits += weight * 0.5; // Partial credit for non-adjacent matches
      }
    }
  });

  return clamp(hits / Math.max(totalWeight, 1));
}

function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function computeRecencyScore(experience: ResumeExperience): number {
  const now = new Date();
  const endDate = experience.isCurrent ? now : parseToDate(experience.endDate);

  if (!endDate) {
    return 0.35;
  }

  const monthsAgo = monthsBetween(endDate, now);

  if (monthsAgo <= 6) return 1;
  if (monthsAgo <= 12) return 0.9;
  if (monthsAgo <= 36) return 0.7;
  if (monthsAgo <= 60) return 0.5;
  if (monthsAgo <= 120) return 0.3;
  return 0.15;
}

function parseToDate(value?: string): Date | null {
  if (!value) return null;
  if (value.toLowerCase() === 'present') return new Date();

  const normalized =
    value.length === 4 ? `${value}-01-01` : value.length === 7 ? `${value}-01` : value;

  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function monthsBetween(start: Date, end: Date): number {
  const years = end.getFullYear() - start.getFullYear();
  const months = end.getMonth() - start.getMonth();
  const days = end.getDate() - start.getDate();
  let total = years * 12 + months;
  if (days < 0) {
    total -= 1;
  }
  return Math.max(1, total + 1);
}

function prioritizeSkills(skills: RetrievedSkill[], requiredSkills?: string[]): RetrievedSkill[] {
  if (!skills?.length) return [];

  if (!requiredSkills?.length) {
    return skills.slice(0, 30); // Increased from 12
  }

  const requiredSet = new Set(
    requiredSkills.map((skill) => skill?.toLowerCase()).filter(Boolean)
  );

  const prioritized = [
    ...skills.filter((skill) => requiredSet.has(skill.canonicalName.toLowerCase())),
    ...skills.filter((skill) => !requiredSet.has(skill.canonicalName.toLowerCase())),
  ];

  const unique: RetrievedSkill[] = [];
  const seen = new Set<string>();

  prioritized.forEach((skill) => {
    const key = skill.canonicalName.toLowerCase();
    if (key && !seen.has(key)) {
      seen.add(key);
      unique.push(skill);
    }
  });

  return unique.slice(0, 30); // Increased from 12
}

function matchHardSkills(text: string, hardSkills: Set<string>): string[] {
  if (!text) return [];
  const normalized = text.toLowerCase();
  const matches: string[] = [];

  hardSkills.forEach((skill) => {
    if (skill && normalized.includes(skill)) {
      matches.push(skill);
    }
  });

  return matches.slice(0, 5);
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (!a?.length || !b?.length || a.length !== b.length) {
    return 0;
  }

  let dot = 0;
  let magA = 0;
  let magB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }

  if (!magA || !magB) {
    return 0;
  }

  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

function mapFiltered(filtered: FilteredExperience[]) {
  return filtered.map((entry) => ({
    id: entry.experience.id,
    title: entry.experience.title,
    company: entry.experience.company,
    reasons: entry.messages,
  }));
}

function clamp(value: number, min = 0, max = 1): number {
  if (Number.isNaN(value)) return min;
  return Math.max(min, Math.min(max, value));
}
