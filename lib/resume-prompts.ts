
import {
    INFERENCE_RULES,
    DOMAIN_INFERENCE_RULES,
    REWRITE_GUIDANCE,
    HALLUCINATION_CHECKPOINT,
    SUMMARY_REQUIREMENTS,
} from './inference-rules';
import { MAX_SKILLS_FOR_PROMPT } from './resume-config';

export interface CacheablePrompt {
    staticPart: string;        // Cached: inference rules, guidelines
    dynamicPart: string;       // Per-request: career profile, JD
    cacheCheckpoint?: string;  // Cache marker for LLM API
}

/**
 * Build writer prompt with cache checkpoint
 * Static content (rules) goes first (high reuse)
 * Dynamic content (profile) goes after checkpoint
 */
export function buildWriterPromptWithCache(params: {
    templateGuidance: string;
    jobDescriptionSnippet: string;
    canonicalSnapshot: string;
    inferenceSnapshot: string;
    preparedProfile: any; // Type as needed, using any for flexibility with existing types
    experienceContext: string;
    skillContext: string;
    educationContext: string;
    certificationContext: string;
    contactInfoContext: string;
    atsFormatGuide: string;
}): CacheablePrompt {

    // Static part: Inference rules, guidelines (cached across all requests)
    // This content MUST remain identical byte-for-byte across requests to hit the cache
    const staticPart = `
You are an expert resume writer and ATS optimization specialist. Your only sources of truth are the canonical blocks provided in the dynamic context.

Template tone: ${params.templateGuidance}

${INFERENCE_RULES}

${DOMAIN_INFERENCE_RULES}

${REWRITE_GUIDANCE}

${HALLUCINATION_CHECKPOINT}

${SUMMARY_REQUIREMENTS}

IMPORTANT: These rules are cached. Apply them consistently for every prompt.
  `.trim();

    // Dynamic part: Specific to this request
    const dynamicPart = `
Target Job Description (truncated to 6k chars):
${params.jobDescriptionSnippet || 'Not provided'}

${params.canonicalSnapshot}

${params.inferenceSnapshot}

Parsed JD Summary:
- Normalized Title: ${params.preparedProfile.parsedJD?.normalizedTitle || 'n/a'}
- Seniority: ${params.preparedProfile.parsedJD?.level || 'IC'}
- Domain: ${params.preparedProfile.parsedJD?.domain || 'general'}
- Responsibilities: ${params.preparedProfile.parsedJD?.responsibilities?.slice(0, 8).join('; ') || 'n/a'}
- Hard Skills (MUST include these in resume where truthful): ${params.preparedProfile.parsedJD?.hardSkills?.slice(0, 40).join(', ') || 'n/a'}
- Soft Skills (weave into bullets naturally): ${params.preparedProfile.parsedJD?.softSkills?.slice(0, 15).join(', ') || 'n/a'}
- Key Phrases (use exact phrasing when possible): ${params.preparedProfile.parsedJD?.keyPhrases?.slice(0, 15).join(', ') || 'n/a'}

Canonical Experience Inventory (reverse chronological order, IDs are stable — do NOT reorder):
${params.experienceContext}

Normalized Skill Pool (deduped, limit ${MAX_SKILLS_FOR_PROMPT}):
${params.skillContext}

Canonical Education:
${params.educationContext}

Canonical Certifications:
${params.certificationContext}

Canonical Contact Information (only include fields with values, NEVER include address):
${params.contactInfoContext}

Quality Guardrails:
- Use ONLY the canonical experiences and skills supplied above. Never invent new companies, titles, dates, or credentials.
- Preserve the experience order exactly as provided; the inventory is already most recent first.
- Company, title, location, and date strings must match the canonical values verbatim (trim whitespace only).
- CRITICAL: Strip ALL placeholder fragments from every field and bullet. This includes but is not limited to: "Company Name", "Job Title", "City, State", "N/A", "Not Provided", "Not Available", "TBD", "YYYY", "YYYY-MM", "20XX", "Example Company", "Your Company", "Insert Title", "Sample Text", "Lorem Ipsum", or any text containing placeholder patterns like {{}}, [[]], <>, or repeated X/Y/Z characters. If a field contains placeholder text, omit that field entirely rather than including placeholder content.
- Each bullet must follow the Action + Context + Result rubric, highlight measurable scope/impact when available, and remain grounded in the supporting achievements for that role.
- Respect the bullet_budget per experience as a TARGET. Maximize this allowance to provide depth, using Level 2 inference to bridge gaps where verified details are sparse but logically implied. Do not output fewer bullets unless you have absolutely no verifiable content left.
- When merging multiple candidate bullets, preserve the strongest metric and union of verified tools/regulations, then log the contributing candidate IDs in "merged_from".
- Professional summary must be a single cohesive paragraph of 4 impactful sentences (minimum 350 characters). Do NOT use bullet points. The summary must: (1) open with years of experience and primary domain expertise, (2) highlight 2-3 verified quantified achievements with specific metrics from canonical experiences, (3) mention 2-3 key tools or skills that directly match the target JD requirements, and (4) close with a clear connection to the target role's core responsibilities. Focus on telling a compelling career narrative. AVOID generic metrics like "Analyzed 100+ reports" - if a metric doesn't clearly demonstrate impact, omit it.
- Skills list must be a deduped subset of the normalized pool ordered by relevance to the target JD.

${params.atsFormatGuide}

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

IMPORTANT: Only include contactInfo fields that have actual values from canonical data. Omit any empty or missing fields. NEVER include address.
  `.trim();

    return {
        staticPart,
        dynamicPart,
        cacheCheckpoint: '### CACHE CHECKPOINT ###'
    };
}
