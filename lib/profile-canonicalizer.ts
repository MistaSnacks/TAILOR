import { randomUUID } from 'crypto';
import { supabaseAdmin } from './supabase';
import { embedText } from './gemini';
import {
  MAX_CANONICAL_BULLETS,
  MAX_CANONICAL_SKILLS,
  BULLET_SIMILARITY_THRESHOLD,
} from './chunking';
import {
  BulletCandidate,
  DedupedBullet,
  dedupeBullets,
} from './bullet-dedupe';

type ExperienceRow = {
  id: string;
  user_id: string;
  company: string;
  title: string;
  location?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  is_current?: boolean | null;
  experience_bullets?: BulletRow[] | null;
};

type BulletRow = {
  id: string;
  content: string;
  source_count?: number | null;
  importance_score?: number | null;
  embedding?: number[] | string | null;
};

type SkillRow = {
  id: string;
  canonical_name: string;
  source_count?: number | null;
};

type DateRange = {
  start: Date | null;
  end: Date | null;
};

const PLACEHOLDER_COMPANY_PATTERNS = [
  /company name/i,
  /your company/i,
  /sample company/i,
  /organization/i,
  /^n\/?a$/i,
];

const PLACEHOLDER_DATE_PATTERNS = [/Y{4}/i, /M{2}/i, /X{2,}/i, /not provided/i];

const ADJACENT_RANGE_WINDOW_MS = 1000 * 60 * 60 * 24 * 45; // ~45 days
const FAR_FUTURE = new Date('9999-12-31T00:00:00.000Z');

/**
 * Check if two job titles are similar enough to be considered the same role.
 * Only merges if titles share a common core (e.g., "PM" and "Senior PM").
 * Keeps completely different roles separate (e.g., "Business Analyst" vs "Program Manager").
 * 
 * Uses the CORE TITLE (part before semicolon/dash) for comparison, not department names.
 */
function titlesAreSimilar(titleA: string, titleB: string): boolean {
  if (!titleA || !titleB) return false;

  // Extract the CORE job title (before any semicolon, dash, or department designation)
  const extractCoreTitle = (t: string) => {
    // Split on common separators and take the first meaningful part
    const corePart = t
      .split(/[;–—|]/)[0]  // Take part before semicolon or em-dash
      .replace(/\s*[-]\s*(department|division|team|group).*$/i, '')  // Remove "- Department" suffixes
      .trim();
    return corePart || t;
  };

  const normalizeTitle = (t: string) =>
    t
      .toLowerCase()
      .replace(/[,()]/g, ' ')
      // Remove level indicators to compare core role
      .replace(/\b(i{1,3}|iv|v|vi|senior|sr|junior|jr|lead|principal|staff|associate|assistant|intern|head of|director of|vp of|chief|1|2|3)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

  // Compare CORE titles (not full titles with department names)
  const coreA = normalizeTitle(extractCoreTitle(titleA));
  const coreB = normalizeTitle(extractCoreTitle(titleB));

  // Exact match after normalization
  if (coreA === coreB) return true;

  // Check if one core title contains the other (e.g., "Program Manager" in "Technical Program Manager")
  if (coreA.includes(coreB) || coreB.includes(coreA)) return true;

  // Check significant word overlap in CORE TITLE
  // Exclude generic words that appear in many titles
  const genericWords = new Set(['manager', 'analyst', 'engineer', 'developer', 'specialist', 'coordinator', 'administrator', 'consultant', 'officer', 'executive', 'representative']);
  
  const wordsA = new Set(coreA.split(' ').filter((w) => w.length > 2 && !genericWords.has(w)));
  const wordsB = new Set(coreB.split(' ').filter((w) => w.length > 2 && !genericWords.has(w)));

  // If one or both have no specific words (just generic like "Manager"), compare the full core
  if (wordsA.size === 0 || wordsB.size === 0) {
    // Fall back to checking if the full normalized cores are very similar
    return coreA === coreB;
  }

  const intersection = [...wordsA].filter((w) => wordsB.has(w));
  const minSize = Math.min(wordsA.size, wordsB.size);

  // Require >50% overlap of SPECIFIC (non-generic) words
  return minSize > 0 && intersection.length / minSize > 0.5;
}

type CanonicalExperienceRecord = {
  id: string;
  normalizedCompany: string;
  displayCompany: string;
  primaryTitle: string;
  titleProgression: string[];
  primaryLocation: string;
  locations: string[];
  startDate: string | null;
  endDate: string | null;
  isCurrent: boolean;
  sourceExperienceIds: string[];
  bullets: DedupedBullet[];
};

type CanonicalSkillRecord = {
  id: string;
  controlledKey: string;
  label: string;
  category: string;
  sourceSkillIds: string[];
  sourceCount: number;
  weight: number;
};

export type CanonicalProfile = {
  experiences: CanonicalExperienceRecord[];
  skills: CanonicalSkillRecord[];
};

const CONTROLLED_SKILL_TAXONOMY: Array<{
  key: string;
  label: string;
  category: string;
  variants: string[];
}> = [
    { key: 'typescript', label: 'TypeScript', category: 'Languages', variants: ['typescript', 'ts'] },
    { key: 'javascript', label: 'JavaScript', category: 'Languages', variants: ['javascript', 'js'] },
    { key: 'python', label: 'Python', category: 'Languages', variants: ['python'] },
    { key: 'java', label: 'Java', category: 'Languages', variants: ['java'] },
    { key: 'golang', label: 'Go', category: 'Languages', variants: ['go', 'golang'] },
    { key: 'react', label: 'React', category: 'Frontend', variants: ['react', 'react.js', 'reactjs'] },
    { key: 'nextjs', label: 'Next.js', category: 'Frontend', variants: ['next.js', 'nextjs', 'next'] },
    { key: 'nodejs', label: 'Node.js', category: 'Backend', variants: ['node', 'node.js', 'nodejs'] },
    { key: 'express', label: 'Express', category: 'Backend', variants: ['express', 'express.js'] },
    { key: 'aws', label: 'AWS', category: 'Cloud', variants: ['aws', 'amazon web services'] },
    { key: 'gcp', label: 'Google Cloud', category: 'Cloud', variants: ['gcp', 'google cloud', 'google cloud platform'] },
    { key: 'azure', label: 'Azure', category: 'Cloud', variants: ['azure', 'microsoft azure'] },
    { key: 'docker', label: 'Docker', category: 'DevOps', variants: ['docker'] },
    { key: 'kubernetes', label: 'Kubernetes', category: 'DevOps', variants: ['kubernetes', 'k8s'] },
    { key: 'postgresql', label: 'PostgreSQL', category: 'Databases', variants: ['postgresql', 'postgres', 'postgres sql'] },
    { key: 'mysql', label: 'MySQL', category: 'Databases', variants: ['mysql'] },
    { key: 'sql', label: 'SQL', category: 'Databases', variants: ['sql'] },
    { key: 'graphql', label: 'GraphQL', category: 'APIs', variants: ['graphql'] },
    { key: 'rest', label: 'REST APIs', category: 'APIs', variants: ['rest', 'rest api', 'restful api'] },
    { key: 'ai-ml', label: 'AI / ML', category: 'AI', variants: ['ai', 'ml', 'machine learning', 'artificial intelligence'] },
    { key: 'llm', label: 'LLM Prompting', category: 'AI', variants: ['llm', 'prompt engineering', 'generative ai'] },
  ];

export async function canonicalizeProfile(userId: string): Promise<CanonicalProfile> {
  if (!userId) {
    throw new Error('User ID is required to canonicalize profile');
  }

  if (!supabaseAdmin) {
    throw new Error('Supabase admin client is not configured');
  }

  console.log('🧱 Building canonical profile for user:', userId);

  // CRITICAL: Ensure user exists before inserting into canonical tables (FK constraint)
  const { data: existingUser, error: userCheckError } = await supabaseAdmin
    .from('users')
    .select('id, email')
    .eq('id', userId)
    .maybeSingle();

  console.log('🔍 [canonicalizeProfile] User check:', {
    userId,
    found: !!existingUser,
    existingUser,
    error: userCheckError?.message || null,
  });

  if (!existingUser) {
    console.log('📝 [canonicalizeProfile] User not found, creating placeholder...');
    // Use dedicated placeholder domain (RFC 2606 reserved domain)
    // email_verified set to current timestamp for consistency with auth flow
    const { data: insertedUser, error: insertError } = await supabaseAdmin
      .from('users')
      .insert({
        id: userId,
        email: `user_${userId.slice(0, 8)}@example.invalid`,
        email_verified: new Date().toISOString()
      })
      .select()
      .single();

    // Sanitize user object before logging (no sensitive data)
    const sanitizedInsertedUser = insertedUser ? {
      id: insertedUser.id.slice(0, 8) + '...',
      email: insertedUser.email ? insertedUser.email.split('@')[0] + '@***' : null,
    } : null;

    console.log('🔍 [canonicalizeProfile] Insert result:', {
      sanitizedInsertedUser,
      error: insertError ? { code: insertError.code, message: insertError.message, details: insertError.details } : null,
    });

    if (insertError) {
      // Could be duplicate email - try with more unique email
      if (insertError.code === '23505') {
        console.log('⚠️ Placeholder email conflict, trying with full UUID...');
        const { data: retryUser, error: retryError } = await supabaseAdmin
          .from('users')
          .insert({
            id: userId,
            email: `user_${userId}@example.invalid`,
            email_verified: new Date().toISOString()
          })
          .select()
          .single();
        
        // Sanitize user object before logging
        const sanitizedRetryUser = retryUser ? {
          id: retryUser.id.slice(0, 8) + '...',
          email: retryUser.email ? retryUser.email.split('@')[0] + '@***' : null,
        } : null;

        console.log('🔍 [canonicalizeProfile] Retry result:', {
          sanitizedRetryUser,
          error: retryError ? { code: retryError.code, message: retryError.message, details: retryError.details } : null,
        });

        if (retryError) {
          console.error('❌ [canonicalizeProfile] Failed to create user after retry:', retryError);
          throw new Error(`User creation failed in canonicalizeProfile: ${retryError.message}`);
        }
        console.log('✅ [canonicalizeProfile] User created (retry):', retryUser?.id);
      } else {
        console.error('❌ [canonicalizeProfile] Failed to create user:', insertError);
        throw new Error(`User creation failed in canonicalizeProfile: ${insertError.message}`);
      }
    } else {
      console.log('✅ [canonicalizeProfile] User created:', insertedUser?.id);
    }

    // Verify user actually exists now
    const { data: verifyUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('id', userId)
      .single();
    
    console.log('🔍 [canonicalizeProfile] Verification:', {
      userId: userId.slice(0, 8) + '...',
      verified: !!verifyUser,
    });

    if (!verifyUser) {
      throw new Error(`User creation appeared to succeed but verification failed for ${userId}`);
    }
  } else {
    // Sanitize email in log
    const sanitizedEmail = existingUser.email ? existingUser.email.split('@')[0] + '@***' : 'no email';
    console.log('✅ [canonicalizeProfile] User exists:', existingUser.id.slice(0, 8) + '...', sanitizedEmail);
  }

  const { experiences, skills } = await fetchRawProfile(userId);
  const canonicalExperiences = await buildCanonicalExperiences(experiences);
  const canonicalSkills = buildCanonicalSkills(skills);

  await persistCanonicalProfile(userId, canonicalExperiences, canonicalSkills);

  console.log('✅ Canonical profile refreshed:', {
    userId,
    experienceCount: canonicalExperiences.length,
    skillCount: canonicalSkills.length,
  });

  return {
    experiences: canonicalExperiences,
    skills: canonicalSkills,
  };
}

export async function getCanonicalProfile(userId: string): Promise<CanonicalProfile> {
  if (!userId) {
    throw new Error('User ID is required to fetch canonical profile');
  }

  if (!supabaseAdmin) {
    throw new Error('Supabase admin client is not configured');
  }

  // Use explicit FK name to avoid ambiguity (there are 2 FKs to canonical_experiences)
  const experiencesQuery = await supabaseAdmin
    .from('canonical_experiences')
    .select('*, canonical_experience_bullets!canonical_experience_bullets_experience_id_fkey(*)')
    .eq('user_id', userId)
    .order('is_current', { ascending: false })
    .order('end_date', { ascending: false, nullsFirst: true });

  if (experiencesQuery.error) {
    console.error('❌ Failed to fetch canonical experiences:', experiencesQuery.error);
    throw experiencesQuery.error;
  }

  const skillsQuery = await supabaseAdmin
    .from('canonical_skills')
    .select('*')
    .eq('user_id', userId)
    .order('label', { ascending: true });

  if (skillsQuery.error) {
    console.error('❌ Failed to fetch canonical skills:', skillsQuery.error);
    throw skillsQuery.error;
  }

  const experiences =
    experiencesQuery.data?.map((experience: any) => ({
      id: experience.id,
      normalizedCompany: experience.normalized_company,
      displayCompany: experience.display_company,
      primaryTitle: experience.primary_title || experience.title_progression?.[0] || '',
      titleProgression: experience.title_progression || [],
      primaryLocation: experience.primary_location || '',
      locations: experience.locations || [],
      startDate: experience.start_date,
      endDate: experience.end_date,
      isCurrent: !!experience.is_current,
      sourceExperienceIds: experience.source_experience_ids || [],
      bullets: (experience.canonical_experience_bullets || []).map((bullet: any) => {
        const representativeBulletId = bullet.representative_bullet_id || undefined;
        const rawSourceIds: string[] = Array.isArray(bullet.source_bullet_ids)
          ? bullet.source_bullet_ids
          : [];
        const supportingBulletIds = representativeBulletId
          ? rawSourceIds.filter((id) => id !== representativeBulletId)
          : rawSourceIds;

        return {
          id: bullet.id,
          content: bullet.content,
          representativeBulletId,
          supportingBulletIds,
          sourceIds: rawSourceIds,
          sourceCount: bullet.source_count || 1,
          averageSimilarity: Number(bullet.avg_similarity || 1),
          embedding: normalizeEmbedding(bullet.embedding),
        };
      }),
    })) || [];

  const skills =
    skillsQuery.data?.map((skill: any) => ({
      id: skill.id,
      controlledKey: skill.controlled_key,
      label: skill.label,
      category: skill.category,
      sourceSkillIds: skill.source_skill_ids || [],
      sourceCount: skill.source_count || 0,
      weight: skill.weight || 0,
    })) || [];

  return { experiences, skills };
}

async function fetchRawProfile(userId: string): Promise<{
  experiences: ExperienceRow[];
  skills: SkillRow[];
}> {
  const experienceQuery = await supabaseAdmin
    .from('experiences')
    .select('*, experience_bullets(*)')
    .eq('user_id', userId);

  if (experienceQuery.error) {
    console.error('❌ Failed to fetch raw experiences:', experienceQuery.error);
    throw experienceQuery.error;
  }

  const skillsQuery = await supabaseAdmin
    .from('skills')
    .select('*')
    .eq('user_id', userId);

  if (skillsQuery.error) {
    console.error('❌ Failed to fetch raw skills:', skillsQuery.error);
    throw skillsQuery.error;
  }

  return {
    experiences: experienceQuery.data || [],
    skills: skillsQuery.data || [],
  };
}

export async function buildCanonicalExperiences(
  experiences: ExperienceRow[]
): Promise<CanonicalExperienceRecord[]> {
  if (!experiences.length) {
    return [];
  }

  const groups: Array<{
    id: string;
    normalizedCompany: string;
    displayCompany: string;
    experiences: ExperienceRow[];
    range: DateRange;
  }> = [];

  const sortedExperiences = [...experiences].sort((a, b) => {
    const aDate = parseDate(a.end_date) || FAR_FUTURE;
    const bDate = parseDate(b.end_date) || FAR_FUTURE;
    return bDate.getTime() - aDate.getTime();
  });

  for (const experience of sortedExperiences) {
    if (shouldSkipExperience(experience)) {
      continue;
    }

    const normalizedCompany = normalizeCompany(experience.company);
    if (!normalizedCompany) {
      continue;
    }

    const range = buildDateRange(experience);

    // Only merge experiences if:
    // 1. Same company (normalized)
    // 2. Date ranges overlap or are adjacent
    // 3. Titles are similar (prevents merging "Business Analyst" with "Program Manager")
    let targetGroup = groups.find(
      (group) =>
        group.normalizedCompany === normalizedCompany.normalized &&
        rangesOverlapOrAdjacent(group.range, range) &&
        titlesAreSimilar(group.experiences[0]?.title || '', experience.title)
    );

    if (!targetGroup) {
      targetGroup = {
        id: randomUUID(),
        normalizedCompany: normalizedCompany.normalized,
        displayCompany: normalizedCompany.display,
        experiences: [],
        range: { ...range },
      };
      groups.push(targetGroup);
    } else {
      targetGroup.range.start = chooseEarliestDate(targetGroup.range.start, range.start);
      targetGroup.range.end = chooseLatestDate(targetGroup.range.end, range.end);
      if (
        normalizedCompany.display &&
        normalizedCompany.display.length > targetGroup.displayCompany.length
      ) {
        targetGroup.displayCompany = normalizedCompany.display;
      }
    }

    targetGroup.experiences.push(experience);
  }

  const canonicalized: CanonicalExperienceRecord[] = [];

  for (const group of groups) {
    const uniqueLocations = Array.from(
      new Set(
        group.experiences
          .map((exp) => exp.location?.trim())
          .filter((value): value is string => !!value)
      )
    );

    const titleProgression = buildTitleProgression(group.experiences);
    const primaryTitle = titleProgression[0] || (group.experiences[0]?.title ?? '');

    const sourceExperienceIds = group.experiences.map((exp) => exp.id);
    const bulletCandidates = group.experiences.flatMap((experience) =>
      (experience.experience_bullets || []).map((bullet) => ({
        id: bullet.id,
        content: bullet.content,
        sourceCount: bullet.source_count,
        importanceScore: bullet.importance_score,
        embedding: bullet.embedding,
      }))
    ) as BulletCandidate[];

    const bulletBudget = calculateBulletBudget(
      group.experiences,
      bulletCandidates.length
    );

    const dedupedBullets =
      bulletCandidates.length > 0
        ? await dedupeBullets(bulletCandidates, {
          similarityThreshold: BULLET_SIMILARITY_THRESHOLD,
          maxBullets: bulletBudget,
        })
        : [];

    canonicalized.push({
      id: group.id,
      normalizedCompany: group.normalizedCompany,
      displayCompany: group.displayCompany,
      primaryTitle: primaryTitle,
      titleProgression,
      primaryLocation: uniqueLocations[0] || '',
      locations: uniqueLocations,
      startDate: normalizeDateString(
        findExtremumDate(group.experiences, 'start', 'min')?.toISOString() || undefined
      ),
      endDate: resolveEndDate(group.experiences),
      isCurrent: group.experiences.some((exp) => !!exp.is_current),
      sourceExperienceIds,
      bullets: dedupedBullets,
    });
  }

  return canonicalized.sort((a, b) => {
    if (a.isCurrent !== b.isCurrent) {
      return a.isCurrent ? -1 : 1;
    }
    const aEnd = parseDate(a.endDate) || FAR_FUTURE;
    const bEnd = parseDate(b.endDate) || FAR_FUTURE;
    return bEnd.getTime() - aEnd.getTime();
  });
}

function buildCanonicalSkills(skills: SkillRow[]): CanonicalSkillRecord[] {
  if (!skills.length) {
    return [];
  }

  const aggregates = new Map<
    string,
    {
      controlledKey: string;
      label: string;
      category: string;
      sourceSkillIds: Set<string>;
      sourceCount: number;
    }
  >();

  for (const skill of skills) {
    const normalized = normalizeSkillName(skill.canonical_name);
    if (!normalized) {
      continue;
    }

    const taxonomyEntry = CONTROLLED_SKILL_TAXONOMY.find((entry) =>
      entry.variants.some((variant) => variant === normalized)
    );

    const controlledKey = taxonomyEntry?.key ?? slugify(normalized);
    const label = taxonomyEntry?.label ?? toTitleCase(normalized);
    const category = taxonomyEntry?.category ?? 'Other';

    if (!aggregates.has(controlledKey)) {
      aggregates.set(controlledKey, {
        controlledKey,
        label,
        category,
        sourceSkillIds: new Set<string>(),
        sourceCount: 0,
      });
    }

    const aggregate = aggregates.get(controlledKey)!;
    aggregate.sourceSkillIds.add(skill.id);
    aggregate.sourceCount += skill.source_count ?? 1;
  }

  const canonicalSkills = Array.from(aggregates.values())
    .map((aggregate) => ({
      id: randomUUID(),
      controlledKey: aggregate.controlledKey,
      label: aggregate.label,
      category: aggregate.category,
      sourceSkillIds: Array.from(aggregate.sourceSkillIds),
      sourceCount: aggregate.sourceCount,
      weight: aggregate.sourceCount,
    }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, MAX_CANONICAL_SKILLS);

  return canonicalSkills;
}

async function persistCanonicalProfile(
  userId: string,
  experiences: CanonicalExperienceRecord[],
  skills: CanonicalSkillRecord[]
) {
  await supabaseAdmin.from('canonical_experience_bullets').delete().eq('user_id', userId);
  await supabaseAdmin.from('canonical_experiences').delete().eq('user_id', userId);
  await supabaseAdmin.from('canonical_skills').delete().eq('user_id', userId);

  if (experiences.length) {
    // Populate both legacy columns (company, title, location) AND Phase-2 columns
    const canonicalExperiencePayload = experiences.map((experience) => ({
      id: experience.id,
      user_id: userId,
      // Legacy columns (NOT NULL)
      company: experience.displayCompany || experience.normalizedCompany,
      title: experience.primaryTitle || experience.titleProgression?.[0] || '',
      location: experience.primaryLocation || experience.locations?.[0] || null,
      // Phase-2 columns
      normalized_company: experience.normalizedCompany,
      display_company: experience.displayCompany,
      primary_title: experience.primaryTitle,
      title_progression: experience.titleProgression || [],
      primary_location: experience.primaryLocation,
      locations: experience.locations || [],
      start_date: experience.startDate,
      end_date: experience.endDate,
      is_current: experience.isCurrent,
      source_experience_ids: experience.sourceExperienceIds,
      source_count: experience.sourceExperienceIds?.length || 0,
      bullet_count: experience.bullets?.length || 0,
    }));

    const insertExperiences = await supabaseAdmin
      .from('canonical_experiences')
      .insert(canonicalExperiencePayload);

    if (insertExperiences.error) {
      console.error('❌ Failed to insert canonical experiences:', insertExperiences.error);
      throw insertExperiences.error;
    }

    // Populate both legacy columns (experience_id, text) AND Phase-2 columns
    const bulletPayload = await Promise.all(
      experiences.flatMap((experience) =>
        experience.bullets.map(async (bullet) => {
          let embedding = bullet.embedding;

          if (!embedding || !embedding.length) {
            try {
              embedding = await embedText(bullet.content);
            } catch (error) {
              console.error('❌ Failed to backfill canonical bullet embedding:', {
                error,
                bulletId: bullet.id,
                experienceId: experience.id,
              });
              embedding = null;
            }
          }

          const sourceBulletIds = bullet.sourceIds && bullet.sourceIds.length
            ? bullet.sourceIds
            : [
              bullet.representativeBulletId,
              ...bullet.supportingBulletIds,
            ].filter((value): value is string => Boolean(value));

          return {
            id: bullet.id,
            // Legacy columns (NOT NULL)
            experience_id: experience.id,
            text: bullet.content,
            // Phase-2 columns
            user_id: userId,
            canonical_experience_id: experience.id,
            representative_bullet_id: bullet.representativeBulletId || null,
            content: bullet.content,
            source_bullet_ids: sourceBulletIds,
            source_count: bullet.sourceCount || sourceBulletIds.length || 1,
            avg_similarity: bullet.averageSimilarity || 1,
            origin: 'canonical',
            embedding: embedding || null,
          };
        })
      )
    );

    if (bulletPayload.length) {
      const insertBullets = await supabaseAdmin
        .from('canonical_experience_bullets')
        .insert(bulletPayload);

      if (insertBullets.error) {
        console.error('❌ Failed to insert canonical bullets:', insertBullets.error);
        throw insertBullets.error;
      }
    }
  }

  if (skills.length) {
    // Populate both legacy columns (name, canonical_name, frequency) AND Phase-2 columns
    const skillPayload = skills.map((skill) => ({
      id: skill.id,
      user_id: userId,
      // Legacy columns (NOT NULL)
      name: skill.label,
      canonical_name: skill.controlledKey || skill.label,
      frequency: skill.sourceCount || 1,
      // Phase-2 columns
      controlled_key: skill.controlledKey,
      label: skill.label,
      category: skill.category || 'Other',
      source_skill_ids: skill.sourceSkillIds || [],
      source_count: skill.sourceCount || 1,
      weight: skill.weight || 0,
    }));

    const insertSkills = await supabaseAdmin.from('canonical_skills').insert(skillPayload);

    if (insertSkills.error) {
      console.error('❌ Failed to insert canonical skills:', insertSkills.error);
      throw insertSkills.error;
    }
  }
}

function shouldSkipExperience(experience: ExperienceRow): boolean {
  if (!experience) {
    return true;
  }

  const title = experience.title?.trim();
  const company = experience.company?.trim();

  const companyIsPlaceholder =
    !!company && matchesPattern(company, PLACEHOLDER_COMPANY_PATTERNS);
  const hasIdentity = Boolean(title) || Boolean(company && !companyIsPlaceholder);

  if (!hasIdentity) {
    return true;
  }

  const invalidDates = hasPlaceholderDates(experience);
  return invalidDates;
}

function hasPlaceholderDates(experience: ExperienceRow): boolean {
  const start = experience.start_date?.trim();
  const end = experience.end_date?.trim();

  const startUsable = !!start && !matchesPattern(start, PLACEHOLDER_DATE_PATTERNS);
  const endUsable = !!end && !matchesPattern(end, PLACEHOLDER_DATE_PATTERNS);
  const isCurrent = Boolean(experience.is_current) || isPresent(end) || (!end && startUsable);

  return !(startUsable || endUsable || isCurrent);
}

function matchesPattern(value: string | null | undefined, patterns: RegExp[]): boolean {
  if (!value) {
    return false;
  }

  return patterns.some((pattern) => pattern.test(value.trim()));
}

function normalizeCompany(company: string): { normalized: string; display: string } | null {
  if (!company) {
    return null;
  }

  const trimmed = company.trim();
  if (!trimmed) {
    return null;
  }

  if (PLACEHOLDER_COMPANY_PATTERNS.some((pattern) => pattern.test(trimmed))) {
    return null;
  }

  const normalized = trimmed
    .toLowerCase()
    .replace(/[,\.]/g, ' ')
    .replace(/\b(inc|llc|corp|co|ltd|limited|company|financial|services|solutions|group|holdings|technologies|systems)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  return {
    normalized,
    display: trimmed,
  };
}

function buildDateRange(experience: ExperienceRow): DateRange {
  const start = parseDate(experience.start_date);
  let end = parseDate(experience.end_date);

  if (experience.is_current || isPresent(experience.end_date)) {
    end = FAR_FUTURE;
  }

  return { start, end };
}

function parseDate(value?: string | null): Date | null {
  if (!value) {
    return null;
  }

  if (isPresent(value)) {
    return FAR_FUTURE;
  }

  if (/^\d{4}$/.test(value)) {
    return new Date(`${value}-01-01T00:00:00.000Z`);
  }

  if (/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) {
    return new Date(`${value}-01T00:00:00.000Z`);
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeDateString(value?: string | null): string | null {
  if (!value) {
    return null;
  }

  if (isPresent(value)) {
    return 'Present';
  }

  if (/^\d{4}$/.test(value)) {
    return value;
  }

  if (/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) {
    return value;
  }

  const parsed = parseDate(value);
  if (!parsed) {
    return value;
  }
  const month = String(parsed.getUTCMonth() + 1).padStart(2, '0');
  return `${parsed.getUTCFullYear()}-${month}`;
}

function rangesOverlapOrAdjacent(a: DateRange, b: DateRange): boolean {
  if (!a.start || !b.start) {
    return true;
  }

  const endA = a.end || FAR_FUTURE;
  const endB = b.end || FAR_FUTURE;
  const overlap = a.start <= endB && b.start <= endA;

  if (overlap) {
    return true;
  }

  const gapAB = Math.abs(endA.getTime() - b.start.getTime());
  const gapBA = Math.abs(endB.getTime() - a.start.getTime());
  return gapAB <= ADJACENT_RANGE_WINDOW_MS || gapBA <= ADJACENT_RANGE_WINDOW_MS;
}

function chooseEarliestDate(a: Date | null, b: Date | null): Date | null {
  if (!a) return b;
  if (!b) return a;
  return a.getTime() <= b.getTime() ? a : b;
}

function chooseLatestDate(a: Date | null, b: Date | null): Date | null {
  if (!a) return b;
  if (!b) return a;
  return a.getTime() >= b.getTime() ? a : b;
}

function buildTitleProgression(experiences: ExperienceRow[]): string[] {
  const sorted = [...experiences].sort((a, b) => {
    const aStart = parseDate(a.start_date) || new Date(0);
    const bStart = parseDate(b.start_date) || new Date(0);
    return bStart.getTime() - aStart.getTime();
  });

  return Array.from(
    new Set(
      sorted
        .map((exp) => exp.title?.trim())
        .filter((value): value is string => !!value)
    )
  );
}

function findExtremumDate(
  experiences: ExperienceRow[],
  field: 'start' | 'end',
  direction: 'min' | 'max'
): Date | null {
  const dates = experiences
    .map((experience) => parseDate(field === 'start' ? experience.start_date : experience.end_date))
    .filter((value): value is Date => !!value);

  if (!dates.length) {
    return null;
  }

  return dates.reduce((result, current) => {
    if (!result) {
      return current;
    }
    if (direction === 'min') {
      return current.getTime() < result.getTime() ? current : result;
    }
    return current.getTime() > result.getTime() ? current : result;
  }, dates[0]);
}

function resolveEndDate(experiences: ExperienceRow[]): string | null {
  const hasCurrent = experiences.some((experience) => experience.is_current || isPresent(experience.end_date));
  if (hasCurrent) {
    return 'Present';
  }

  const latestEndDate = findExtremumDate(experiences, 'end', 'max');
  return normalizeDateString(latestEndDate?.toISOString() || null);
}

function calculateBulletBudget(
  experiences: ExperienceRow[],
  candidateCount: number
): number {
  if (!candidateCount) {
    return 0;
  }

  const durationMonths = calculateExperienceDurationMonths(experiences);

  if (!durationMonths) {
    return Math.max(1, Math.min(candidateCount, MAX_CANONICAL_BULLETS));
  }

  let budget: number;

  if (durationMonths >= 60) {
    budget = 24;
  } else if (durationMonths >= 48) {
    budget = 20;
  } else if (durationMonths >= 36) {
    budget = 16;
  } else if (durationMonths >= 24) {
    budget = 12;
  } else if (durationMonths >= 12) {
    budget = 8;
  } else if (durationMonths >= 6) {
    budget = 5;
  } else {
    budget = 3;
  }

  const cappedBudget = Math.min(budget, MAX_CANONICAL_BULLETS);
  return Math.max(1, Math.min(candidateCount, cappedBudget));
}

function calculateExperienceDurationMonths(experiences: ExperienceRow[]): number | null {
  if (!experiences.length) {
    return null;
  }

  const earliestStart = findExtremumDate(experiences, 'start', 'min');
  if (!earliestStart) {
    return null;
  }

  const hasCurrent = experiences.some((experience) => experience.is_current || isPresent(experience.end_date));
  const rawEnd = hasCurrent ? new Date() : findExtremumDate(experiences, 'end', 'max');
  const endDate = rawEnd ?? earliestStart;

  return Math.max(1, monthsBetween(earliestStart, endDate));
}

function monthsBetween(start: Date, end: Date): number {
  const normalizedStart = start.getTime() <= end.getTime() ? start : end;
  const normalizedEnd = start.getTime() <= end.getTime() ? end : start;

  const yearDiff = normalizedEnd.getUTCFullYear() - normalizedStart.getUTCFullYear();
  const monthDiff = normalizedEnd.getUTCMonth() - normalizedStart.getUTCMonth();
  const dayDiff = normalizedEnd.getUTCDate() - normalizedStart.getUTCDate();

  let totalMonths = yearDiff * 12 + monthDiff;
  if (dayDiff < 0) {
    totalMonths -= 1;
  }

  return Math.max(1, totalMonths + 1);
}

function isPresent(value?: string | null): boolean {
  if (!value) return false;
  return /present/i.test(value.trim());
}

function normalizeSkillName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[\u2022•]/g, ' ')
    .replace(/[^a-z0-9\+]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function slugify(value: string): string {
  return value.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function toTitleCase(value: string): string {
  return value.replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1));
}

function normalizeEmbedding(value: number[] | string | null | undefined): number[] | null {
  if (!value) {
    return null;
  }

  if (Array.isArray(value)) {
    return value;
  }

  const sanitized = value.replace(/[{}\[\]\(\)]/g, '');
  const parsed = sanitized
    .split(',')
    .map((segment) => Number.parseFloat(segment.trim()))
    .filter((num) => !Number.isNaN(num));

  return parsed.length ? parsed : null;
}

