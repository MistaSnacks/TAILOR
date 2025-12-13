/**
 * Resume Generation Configuration
 * SINGLE SOURCE OF TRUTH for all resume generation constants
 * 
 * This file consolidates constants from:
 * - gemini.ts
 * - openai.ts
 * - selector.ts
 * - resume-quality-pass.ts
 * - training/TRAINING_RULES.md
 */

// =============================================================================
// BULLET BUDGETS (aligned with Training Rules)
// =============================================================================

/**
 * Bullet budgets by experience recency.
 * Training Rules specify: 5-6, 4-5, 3-4, 2-3
 * We use the upper bounds for flexibility.
 */
export const BULLET_BUDGETS = {
    MOST_RECENT: 6,      // Training: 5-6
    SECOND: 5,           // Training: 4-5
    THIRD_FOURTH: 4,     // Training: 3-4
    OLDER: 3,            // Training: 2-3
    MINIMUM: 2,
} as const;

/**
 * Maximum bullets per role (hard cap)
 */
export const MAX_BULLETS_PER_ROLE = 6;

/**
 * Total resume bullet targets by seniority level.
 * Research shows 15-18 is ideal for mid-to-senior professionals.
 */
export const TOTAL_BULLET_TARGETS = {
    ENTRY: { min: 8, ideal: 10, max: 12 },
    MID: { min: 12, ideal: 16, max: 18 },
    SENIOR: { min: 15, ideal: 18, max: 22 },
    EXEC: { min: 18, ideal: 21, max: 25 },
} as const;

export type SeniorityLevel = keyof typeof TOTAL_BULLET_TARGETS;

/**
 * Bullet budgets based on JD relevance score.
 * Research recommends allocating bullets by relevance, not just recency.
 */
export const RELEVANCE_BASED_BUDGETS = {
    HIGH: 6,      // relevance > 0.7
    GOOD: 5,      // relevance 0.5-0.7  
    MODERATE: 4,  // relevance 0.3-0.5
    LOW: 2,       // relevance 0.1-0.3
    MINIMAL: 1,   // relevance < 0.1 (consider dropping)
} as const;

/**
 * Role age thresholds in months for bullet allocation decisions.
 * Older roles should get fewer bullets unless highly relevant.
 */
export const ROLE_AGE_THRESHOLDS = {
    RECENT: 24,      // 0-2 years ago - full budget
    MID_CAREER: 84,  // 2-7 years ago - moderate budget
    OLDER: 120,      // 7-10 years ago - minimal budget
    ANCIENT: 180,    // 10+ years ago - consider dropping
} as const;

/**
 * Validate total bullet count across a resume.
 * Returns diagnostic info about whether the count is optimal.
 */
export function validateTotalBulletCount(
    experiences: Array<{ bullets?: string[] }>,
    userLevel: SeniorityLevel = 'MID'
): { total: number; status: 'IDEAL' | 'LOW' | 'HIGH'; recommendation: string } {
    const target = TOTAL_BULLET_TARGETS[userLevel];
    const total = experiences.reduce((sum, exp) => sum + (exp.bullets?.length || 0), 0);

    if (total < target.min) {
        return {
            total,
            status: 'LOW',
            recommendation: `Resume may appear thin (${total} bullets). Target: ${target.ideal} for ${userLevel.toLowerCase()} level.`,
        };
    }
    if (total > target.max) {
        return {
            total,
            status: 'HIGH',
            recommendation: `Resume is dense (${total} bullets). Consider trimming to ~${target.ideal} for better scannability.`,
        };
    }
    return {
        total,
        status: 'IDEAL',
        recommendation: `Bullet count is optimal (${total} bullets) for ${userLevel.toLowerCase()} level.`,
    };
}

// =============================================================================
// EXPERIENCE LIMITS
// =============================================================================

/**
 * Maximum experiences to include in the prompt context
 */
export const MAX_EXPERIENCES_FOR_PROMPT = 5;

/**
 * Maximum experiences to pass to the writer
 */
export const MAX_WRITER_EXPERIENCES = 5;

// =============================================================================
// SKILLS LIMITS
// =============================================================================

/**
 * Maximum skills to include in prompt (Training Rules: 30-40)
 */
export const MAX_SKILLS_FOR_PROMPT = 40;

/**
 * Maximum skills to output in final resume
 */
export const MAX_SKILLS_FOR_RESUME = 40;

// =============================================================================
// INFERENCE CONTEXT
// =============================================================================

/**
 * Maximum lines of inference context (highlights, metric signals)
 */
export const MAX_INFERENCE_CONTEXT_LINES = 12;

/**
 * Maximum bullet candidates to consider per role
 */
export const MAX_BULLET_CONTEXT_PER_ROLE = 8;

// =============================================================================
// KEYWORD LIMITS
// =============================================================================

/**
 * Maximum keywords to inject during quality pass
 */
export const KEYWORD_INJECTION_LIMIT = 12;

// =============================================================================
// SUMMARY REQUIREMENTS (from Training Rules)
// =============================================================================

export const SUMMARY_CONFIG = {
    /** Number of sentences (Training Rules: 4-sentence structure) */
    SENTENCE_COUNT: 4,

    /** Minimum character length */
    MIN_CHARACTERS: 350,

    /** Number of metrics to include (Training Rules: 2-3) */
    REQUIRED_METRICS: 2,
} as const;

// =============================================================================
// REWRITE TARGETS
// =============================================================================

/**
 * Target percentage of bullets to rewrite based on role relevance.
 * Unifies the conflicting directives:
 * - OpenAI said "60-80%" (too aggressive)
 * - Gemini said "only when obviously supported" (too conservative)
 * - This is the balanced middle ground
 */
export const REWRITE_TARGETS = {
    /** Highly relevant experiences: rewrite more aggressively */
    PRIMARY_ROLE: { min: 0.4, max: 0.6 },    // 40-60%

    /** Supporting experiences: keep more original content */
    CONTEXT_ROLE: { min: 0.1, max: 0.3 },    // 10-30%
} as const;

// =============================================================================
// ROLE TYPES
// =============================================================================

/**
 * Role type for differentiated treatment in generation
 */
export type RoleType = 'primary' | 'context';

/**
 * Threshold for classifying a role as primary vs context
 * Based on alignment score from selector
 */
export const PRIMARY_ROLE_THRESHOLD = 0.6;

// =============================================================================
// INFERENCE LEVELS
// =============================================================================

/**
 * Inference levels for truthfulness validation
 * From Resume Revamp 2.md anti-hallucination framework
 */
export const INFERENCE_LEVEL = {
    /** Level 1: Skill already explicitly stated in bullet */
    DIRECT: 1,

    /** Level 2: Logically implied by the work (ALLOWED) */
    LOGICAL: 2,

    /** Level 3: Would require speculation (FORBIDDEN) */
    FORBIDDEN: 3,
} as const;

export type InferenceLevel = typeof INFERENCE_LEVEL[keyof typeof INFERENCE_LEVEL];

// =============================================================================
// ATS SCORING
// =============================================================================

export const ATS_CONFIG = {
    /** Semantic similarity threshold for keyword matching */
    SEMANTIC_THRESHOLD: 0.70,

    /** Partial match threshold */
    PARTIAL_THRESHOLD: 0.55,

    /** Weights for tiered scoring (from Resume Revamp 2) */
    WEIGHTS: {
        CRITICAL: 0.40,      // 40% weight for must-have
        IMPORTANT: 0.35,     // 35% weight for preferred
        NICE_TO_HAVE: 0.25,  // 25% weight for bonus
    },
} as const;

// =============================================================================
// VALIDATION THRESHOLDS (from selector.ts)
// =============================================================================

export const SELECTION_CONFIG = {
    /** Minimum semantic alignment score for bullet inclusion */
    SEMANTIC_ALIGNMENT_FLOOR: 0.30,

    /** Minimum keyword alignment score */
    KEYWORD_ALIGNMENT_FLOOR: 0.20,

    /** Minimum overall score for experience selection */
    MIN_EXPERIENCE_SCORE: 0.35,
} as const;
