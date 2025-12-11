/**
 * Inference Rules & Prompt Constants
 * 
 * This file contains the unified inference framework and prompt constants
 * used across all resume generation passes (Gemini, OpenAI, Quality Pass).
 * 
 * Based on Resume Revamp 2.md anti-hallucination framework.
 */

import {
    INFERENCE_LEVEL,
    REWRITE_TARGETS,
    SUMMARY_CONFIG,
} from './resume-config';

// =============================================================================
// INFERENCE ENFORCEMENT RULES
// =============================================================================

export const INFERENCE_RULES = `
=== INFERENCE ENFORCEMENT (READ CAREFULLY) ===

Use ONLY Levels 1 and 2 inference. BLOCK any Level 3 attempts.

**Level 1 (Direct)**: Skill already stated in bullet
  ✓ "Python development" → "Python/backend development"

**Level 2 (Logical Inference - ALLOWED)**:
  Original: "Developed web platform serving 1M+ users"
  ✓ Can infer: "scalability thinking", "performance optimization", "system design"
  Why: Building for scale necessarily requires these skills

  Original: "Managed team of 5 engineers, shipped product v2.0"
  ✓ Can infer: "Agile/Scrum", "Team leadership", "Delivery track record"
  Why: Managing a team to ship on schedule necessarily involves these

**Level 3 (FORBIDDEN - Block immediately)**:
  Original: "Worked on internal tools"
  ✗ Cannot infer: "AWS/cloud infrastructure"
  Why: Internal tools could be desktop, on-premise, many things → speculation
  Action: OMIT the inference entirely

  Original: "Improved code quality"
  ✗ Cannot infer: "Reduced bugs by 40%"
  Why: No metric exists in profile → fabrication
  Action: Use "Established code quality standards and peer review process" instead

=== CRITICAL RULES ===

❌ NEVER:
- Invent skills not in the career profile
- Add metrics (%, $, time) that don't exist in the profile
- Claim technologies user never used
- Describe responsibilities they didn't perform

✅ ALLOWED:
- Reframe using better language for the JD domain
- Make implicit skills explicit (Level 2 inference)
- Reorganize bullet points for job relevance
- Use exact JD terminology to match user's existing work
- Connect related experiences to show breadth
`;

// =============================================================================
// DOMAIN-LEVEL INFERENCE GUIDANCE
// =============================================================================

export const DOMAIN_INFERENCE_RULES = `
=== DOMAIN-LEVEL INFERENCE (ENCOURAGED) ===

When logically implied, infer domain connections:
- "Fraud Analyst" → can infer "Fraud Risk Management", "Fraud Detection", "Financial Crime"
- "Led engineering team" → can infer "Agile", "mentorship", "communication", "technical leadership"
- "Developed web platform" → can infer "Full-stack development", "deployment", "CI/CD" (if in bullet context)
- "Built data pipelines" → can infer "ETL", "data engineering", "data quality"

Use JD terminology when it accurately describes verified work.

=== JD PHRASE MATCHING RULE ===

When JD uses specific phrases (e.g., "fraud risk management", "digital payments operations"):
- Prefer these exact phrases over generic equivalents
- Only when both accurately describe the candidate's experience
- This improves ATS keyword matching significantly

Example:
- JD says: "trust & safety"
- Resume says: "content moderation and abuse prevention"
- Better: "trust & safety operations including content moderation and abuse prevention"
`;

// =============================================================================
// BULLET REWRITING PHILOSOPHY
// =============================================================================

export const REWRITE_GUIDANCE = `
=== BULLET REWRITING PHILOSOPHY ===

**Target Rewrite Rate**:
- PRIMARY roles (highly relevant): ${REWRITE_TARGETS.PRIMARY_ROLE.min * 100}-${REWRITE_TARGETS.PRIMARY_ROLE.max * 100}% of bullets
- CONTEXT roles (supporting): ${REWRITE_TARGETS.CONTEXT_ROLE.min * 100}-${REWRITE_TARGETS.CONTEXT_ROLE.max * 100}% of bullets

**When to rewrite** ✓:
- Bullet lacks strong action verb
- Bullet has metrics that could be made more prominent
- JD terminology would accurately describe the work
- Domain inference is logically implied (Level 2)
- Bullet could better emphasize JD-relevant aspects

**When NOT to rewrite** ✗:
- Would require inventing facts (Level 3)
- Original is already strong and JD-aligned
- No clear improvement path
- Would lose verified metrics or specifics

**Action Verb Upgrades**:
- "Worked on" → "Developed", "Built", "Designed"
- "Helped with" → "Collaborated on", "Contributed to", "Supported"
- "Was responsible for" → "Managed", "Led", "Oversaw"
- "Did" → Specific action verb matching the work
`;

// =============================================================================
// HALLUCINATION CHECKPOINT
// =============================================================================

export const HALLUCINATION_CHECKPOINT = `
=== HALLUCINATION CHECKPOINT ===

Before outputting ANY bullet, verify:
1. ✓ Is every claim 100% traceable to the career profile?
2. ✓ Would the candidate stake their reputation on this in an interview?
3. ✓ Did I invent any tech/metric not in the profile?
4. ✓ Am I making ONLY Level 1-2 inferences, no Level 3?
5. ✓ Can I cite the career profile for each claim?

If NO to any → OMIT the bullet or significantly weaken the claim.

**Validation Logic**:
- ANY FABRICATED claim → REJECT the bullet entirely
- ANY Level 3 inference → Block and suggest alternative
- QUESTIONABLE but not fabricated → Include with conservative framing
- All VERIFIED + Level 1-2 only → ACCEPT
`;

// =============================================================================
// SUMMARY REQUIREMENTS
// =============================================================================

export const SUMMARY_REQUIREMENTS = `
=== SUMMARY REQUIREMENTS ===

Generate a ${SUMMARY_CONFIG.SENTENCE_COUNT}-sentence summary with this structure:

1. **Sentence 1**: Years of experience + primary domain expertise
   Example: "Detail-oriented professional with 7+ years of experience in fraud prevention and financial crime investigations."

2. **Sentence 2**: ${SUMMARY_CONFIG.REQUIRED_METRICS}+ verified quantified achievements with specific metrics
   Example: "Proven track record of preventing $200K+ weekly losses through proactive fraud detection and managing 50+ daily case escalations."

3. **Sentence 3**: Key tools/skills directly relevant to target JD
   Example: "Proficient in SQL, Python, Tableau, and case management systems for data-driven risk analysis."

4. **Sentence 4**: Connection to target role's core requirements
   Example: "Eager to leverage operational expertise and cross-functional collaboration skills to enhance platform safety at [Company]."

**Minimum length**: ${SUMMARY_CONFIG.MIN_CHARACTERS} characters

**AVOID**:
- Generic metrics like "Analyzed 100+ reports" (unless truly impactful)
- Bullet points in the summary (must be a paragraph)
- Metrics not supported by the career profile
- Vague statements without specifics
`;

// =============================================================================
// COMBINED PROMPT CONSTANTS
// =============================================================================

/**
 * Get all inference rules as a single string for prompts
 */
export function getFullInferenceRules(): string {
    return `
${INFERENCE_RULES}

${DOMAIN_INFERENCE_RULES}

${REWRITE_GUIDANCE}

${HALLUCINATION_CHECKPOINT}

${SUMMARY_REQUIREMENTS}
`.trim();
}

/**
 * Validate an inference level
 */
export function isValidInference(level: number): boolean {
    return level === INFERENCE_LEVEL.DIRECT || level === INFERENCE_LEVEL.LOGICAL;
}

/**
 * Check if an inference should be blocked
 */
export function shouldBlockInference(level: number): boolean {
    return level === INFERENCE_LEVEL.FORBIDDEN;
}
