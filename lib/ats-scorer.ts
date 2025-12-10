

import { openai, embedText } from './openai';
import { generateVariantsForMatch } from './resume-quality-pass';

export type KeywordPriority = 'critical' | 'important' | 'nice_to_have';

export type JdKeyword = {
    term: string;
    variants: string[]; // Synonyms for looser matching
    category: KeywordPriority;
};

export type ExtractedKeywords = {
    critical: JdKeyword[];
    important: JdKeyword[];
    nice_to_have: JdKeyword[];
    domainContext: string[];
};

export type KeywordMatchResult = {
    keyword: JdKeyword;
    status: 'exact' | 'semantic' | 'partial' | 'missing';
    score: number; // 0 to 1
    matchedTerm?: string; // The actual term found in resume
};

export type CategoryResult = {
    score: number; // 0-100
    totalKeywords: number;
    matchedCount: number;
    matches: KeywordMatchResult[];
};

export type SemanticMetrics = {
    keywordsProcessed: number;
    keywordsUpgraded: number;
    upgradeRatio: number;  // 0-1, actual semantic effectiveness
};

export type GroundedImprovement = {
    keyword: string;
    priority: 'critical' | 'important';
    suggestion: string;
    context?: string;
    isVerifiedSkill: boolean;
};

export type AtsScoreResult = {
    finalScore: number;
    scoreInterpretation: string;
    recommendation: string;
    categoryBreakdown: Record<KeywordPriority, CategoryResult>;
    strengths: string[];
    gaps: string[];
    actionableImprovements: GroundedImprovement[];
    semanticMetrics: SemanticMetrics;
};

// Step 1: Extract JD Components with Synonyms
export async function extractJdKeywords(jobDescription: string): Promise<ExtractedKeywords> {
    if (!openai) throw new Error('OpenAI client not initialized');

    const prompt = `
    Analyze this Job Description and extract ALL keywords into three categories based on their importance.
    For each keyword, provide 2-4 common synonyms or variations to aid in matching.

    Categories:
    1. Critical (15-25 items): MUST-HAVE requirements that would disqualify candidates if missing:
       - Required years of experience (e.g., "5+ years experience")
       - Required education (e.g., "Bachelor's degree")
       - Core technical skills explicitly required
       - Required certifications
       - Primary job function keywords
    
    2. Important (15-25 items): Strongly preferred skills that improve candidacy:
       - Preferred skills and tools
       - Secondary technical competencies
       - Industry experience
       - Leadership/management for senior roles
    
    3. Bonus (10-15 items): Nice-to-have that give extra points:
       - "Plus" or "preferred" skills
       - Advanced/specialized skills
       - Additional certifications

    Also extract "Domain Context" terms (industry-specific jargon verbatim from JD).
    
    Job Description:
    ${jobDescription.slice(0, 5000)}

    Return JSON:
    {
      "critical": [{ "term": "string", "variants": ["string"] }],
      "important": [{ "term": "string", "variants": ["string"] }],
      "nice_to_have": [{ "term": "string", "variants": ["string"] }],
      "domain_context": ["string"]
    }

    BE EXHAUSTIVE. Extract every requirement, skill, tool, and qualification mentioned.
  `;

    const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.1,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('Failed to extract keywords');

    const raw = JSON.parse(content);

    // Normalize output
    const mapToType = (list: any[], cat: KeywordPriority): JdKeyword[] =>
        (list || []).map(item => ({
            term: item.term,
            variants: item.variants || [],
            category: cat
        }));

    return {
        critical: mapToType(raw.critical, 'critical'),
        important: mapToType(raw.important, 'important'),
        nice_to_have: mapToType(raw.nice_to_have, 'nice_to_have'),
        domainContext: raw.domain_context || []
    };
}

// Step 2: Match Keywords Deterministically (with variant-aware matching)
export function analyzeKeywordMatches(resumeText: string, keywords: JdKeyword[]): KeywordMatchResult[] {
    const normalizedResume = resumeText.toLowerCase();

    return keywords.map(kw => {
        // 0. Check for "X+ years of experience" numeric matching
        const yearsCheck = checkYearsOfExperience(kw.term, normalizedResume);
        if (yearsCheck.matched) {
            return { keyword: kw, status: 'semantic', score: 1.0, matchedTerm: `${yearsCheck.foundYears}+ years` };
        }

        // 0.5. Check for education/degree requirements
        const educationCheck = checkEducationRequirement(kw.term, normalizedResume);
        if (educationCheck.matched) {
            return { keyword: kw, status: 'semantic', score: 1.0, matchedTerm: educationCheck.matchedTerm || kw.term };
        }

        // 1. Generate all variants (handles hyphen/space swaps, pluralization)
        const keywordVariants = generateVariantsForMatch(kw.term);

        // 2. Exact match (any variant form)
        for (const variant of keywordVariants) {
            if (new RegExp(`\\b${escapeRegex(variant)}\\b`).test(normalizedResume)) {
                return { keyword: kw, status: 'exact', score: 1.0, matchedTerm: kw.term };
            }
        }

        // 3. JD-provided variant match (treated as semantic)
        for (const jdVariant of kw.variants) {
            const jdVariantForms = generateVariantsForMatch(jdVariant);
            for (const form of jdVariantForms) {
                if (new RegExp(`\\b${escapeRegex(form)}\\b`).test(normalizedResume)) {
                    return { keyword: kw, status: 'semantic', score: 1.0, matchedTerm: jdVariant };
                }
            }
        }

        // 4. Partial Match (substring, lower score)
        for (const variant of keywordVariants) {
            if (normalizedResume.includes(variant)) {
                return { keyword: kw, status: 'partial', score: 0.5, matchedTerm: kw.term };
            }
        }

        return { keyword: kw, status: 'missing', score: 0 };
    });
}

/**
 * Extract skill-like phrases from resume for semantic comparison.
 * Improved: broader section matching, not just "Skills:" heading.
 */
function extractResumeSkillPhrases(resumeText: string): string[] {
    const normalizedText = resumeText.toLowerCase();
    const skillPhrases = new Set<string>();

    // 1. Extract from ANY section with skill-like patterns (not just "Skills:")
    const sectionPatterns = [
        /(?:skills|competencies|expertise|technologies|tools|proficiencies)[:\s]*([^\n]+(?:\n(?![a-z]+:)[^\n]+)*)/gi,
        /(?:technical|core|key|professional)\s+(?:skills|competencies)[:\s]*([^\n]+)/gi,
        /(?:areas of expertise|technical proficiencies)[:\s]*([^\n]+)/gi,
    ];

    for (const pattern of sectionPatterns) {
        const matches = normalizedText.matchAll(pattern);
        for (const match of matches) {
            const skillsText = match[1] || '';
            const skills = skillsText.split(/[,|•·;\n]+/).map(s => s.trim()).filter(s => s.length > 1 && s.length < 50);
            skills.forEach(s => skillPhrases.add(s));
        }
    }

    // 2. Extract tool/technology mentions (capitalized words, abbreviations, common tools)
    const techPatterns = [
        /\b[A-Z][a-z]+(?:\.[A-Z][a-z]+)*\b/g,  // Proper nouns (React, Python)
        /\b[A-Z]{2,}\b/g,  // Acronyms (SQL, AWS, CI/CD)
        /\b(?:python|javascript|typescript|java|sql|react|node\.?js|aws|docker|kubernetes|git|excel|tableau|looker|grafana|jira|confluence|salesforce|slack|figma|photoshop|sketch|power\s*bi|google\s*analytics)\b/gi,
    ];

    techPatterns.forEach(pattern => {
        const matches = resumeText.match(pattern) || [];
        matches.forEach(m => {
            if (m.length > 1 && m.length < 30) skillPhrases.add(m.toLowerCase());
        });
    });

    // 3. Extract key phrases from bullet points (action verbs + context)
    const bulletPhrases = normalizedText.match(/(?:led|managed|developed|built|created|implemented|designed|analyzed|optimized|reduced|increased|improved|collaborated|coordinated|executed|delivered|spearheaded|drove|launched|established)\s+[^.!?\n]{10,60}/g) || [];
    bulletPhrases.forEach(phrase => {
        const coreMatch = phrase.match(/^(\w+\s+\w+(?:\s+\w+)?)/);
        if (coreMatch) skillPhrases.add(coreMatch[1]);
    });

    // 4. Extract domain-specific terms (expanded list)
    const domainTerms = normalizedText.match(/\b(?:machine learning|data analysis|data visualization|project management|cross[- ]functional|stakeholder management|content moderation|fraud detection|fraud prevention|fraud risk|risk management|process improvement|automation|leadership|communication|problem[- ]solving|analytical skills|technical skills|digital payments|credit card|data engineering|data science|business intelligence|agile|scrum|kanban|devops|ci\/cd|cloud computing)\b/gi) || [];
    domainTerms.forEach(term => skillPhrases.add(term.toLowerCase()));

    console.log(`📋 Extracted ${skillPhrases.size} skill phrases from resume`);
    return Array.from(skillPhrases).filter(s => s.length >= 2);
}

// Semantic matching using embeddings - compares keywords against extracted skill phrases
// Returns enhanced results AND semantic metrics for tracking
async function enhanceWithSemanticMatching(
    results: KeywordMatchResult[],
    resumeText: string
): Promise<{ enhanced: KeywordMatchResult[]; metrics: SemanticMetrics }> {
    const missingKeywords = results.filter(r => r.status === 'missing');

    // Default metrics for early returns
    const defaultMetrics: SemanticMetrics = {
        keywordsProcessed: 0,
        keywordsUpgraded: 0,
        upgradeRatio: 0,
    };

    if (missingKeywords.length === 0) {
        console.log('✅ Semantic matching: No missing keywords to process');
        return { enhanced: results, metrics: defaultMetrics };
    }

    const resumeSkills = extractResumeSkillPhrases(resumeText);
    if (resumeSkills.length === 0) {
        console.warn('⚠️ SEMANTIC_SKIP: No skill phrases extracted - falling back to literal matching');
        console.warn('   Resume text preview:', resumeText.substring(0, 200).replace(/\n/g, ' '));
        return { enhanced: results, metrics: { ...defaultMetrics, keywordsProcessed: missingKeywords.length } };
    }

    console.log(`🔍 Semantic matching: ${missingKeywords.length} missing keywords against ${resumeSkills.length} resume skills`);

    // Get embeddings for resume skills with failure tracking
    const skillsToEmbed = resumeSkills.slice(0, 50);
    let embedFailCount = 0;
    const skillEmbeddings = await Promise.all(
        skillsToEmbed.map(skill => embedText(skill).catch((err) => {
            embedFailCount++;
            return null;
        }))
    );

    if (embedFailCount > 0) {
        console.warn(`⚠️ SEMANTIC_PARTIAL: ${embedFailCount}/${skillsToEmbed.length} skill embeddings failed`);
    }

    const validSkillEmbeddings: { skill: string; embedding: number[] }[] = [];
    skillEmbeddings.forEach((emb, i) => {
        if (emb && emb.length > 0) {
            validSkillEmbeddings.push({ skill: skillsToEmbed[i], embedding: emb });
        }
    });

    if (validSkillEmbeddings.length === 0) {
        console.warn('⚠️ SEMANTIC_FAIL: All skill embeddings failed - falling back to literal matching');
        return { enhanced: results, metrics: { ...defaultMetrics, keywordsProcessed: missingKeywords.length } };
    }

    // Track upgrades
    let keywordsUpgraded = 0;

    const enhanced = await Promise.all(results.map(async (r) => {
        if (r.status !== 'missing') return r;

        const keywordEmbedding = await embedText(r.keyword.term).catch(() => null);
        if (!keywordEmbedding || keywordEmbedding.length === 0) return r;

        let maxSimilarity = 0;
        let bestMatch = '';
        for (const { skill, embedding } of validSkillEmbeddings) {
            const sim = cosineSimilarity(keywordEmbedding, embedding);
            if (sim > maxSimilarity) {
                maxSimilarity = sim;
                bestMatch = skill;
            }
        }

        if (maxSimilarity >= 0.5) {
            console.log(`   → "${r.keyword.term}" ≈ "${bestMatch}" (${(maxSimilarity * 100).toFixed(1)}%)`);
        }

        // Thresholds tuned: skill-to-skill comparisons typically score 0.50-0.70
        if (maxSimilarity >= 0.58) {
            keywordsUpgraded++;
            return { ...r, status: 'semantic' as const, score: 0.9, matchedTerm: `${bestMatch} ≈ ${r.keyword.term}` };
        } else if (maxSimilarity >= 0.45) {
            keywordsUpgraded++;
            return { ...r, status: 'partial' as const, score: 0.5, matchedTerm: `${bestMatch} (partial match)` };
        }

        return r;
    }));

    const metrics: SemanticMetrics = {
        keywordsProcessed: missingKeywords.length,
        keywordsUpgraded,
        upgradeRatio: missingKeywords.length > 0 ? keywordsUpgraded / missingKeywords.length : 0,
    };

    console.log(`✅ Semantic matching complete: ${keywordsUpgraded}/${missingKeywords.length} keywords upgraded (${(metrics.upgradeRatio * 100).toFixed(1)}%)`);

    return { enhanced, metrics };
}

function cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    let dotProduct = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

function escapeRegex(string: string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Checks if a "X+ years of experience" requirement is satisfied by the resume.
 * E.g., if the JD requires "3+ years of experience" and the resume mentions
 * "7 years of experience", this returns true.
 */
function checkYearsOfExperience(keyword: string, resumeText: string): { matched: boolean; foundYears?: number } {
    // Match patterns like "3+ years", "3-5 years", "3 years", "5+ years of experience"
    const yearsPattern = /(\d+)\+?\s*(?:-\s*\d+)?\s*years?/i;
    const keywordMatch = keyword.toLowerCase().match(yearsPattern);

    if (!keywordMatch) {
        return { matched: false };
    }

    const requiredYears = parseInt(keywordMatch[1], 10);

    // Look for years mentions in the resume
    // Patterns: "7 years", "7+ years", "over 7 years", "more than 7 years"
    const resumeYearsPattern = /(?:over|more than|\b)(\d+)\+?\s*(?:-\s*\d+)?\s*years?/gi;
    let match;
    let maxYears = 0;

    while ((match = resumeYearsPattern.exec(resumeText)) !== null) {
        const foundYears = parseInt(match[1], 10);
        if (foundYears > maxYears) {
            maxYears = foundYears;
        }
    }

    if (maxYears >= requiredYears) {
        return { matched: true, foundYears: maxYears };
    }

    return { matched: false };
}

/**
 * Checks if an education/degree requirement is satisfied by the resume.
 * E.g., "Bachelor's Degree" should match "B.S.", "BA", "Bachelor of Science", etc.
 */
function checkEducationRequirement(keyword: string, resumeText: string): { matched: boolean; matchedTerm?: string } {
    const keywordLower = keyword.toLowerCase();

    // Define degree categories with their variations
    const degreePatterns: { check: RegExp; patterns: RegExp[] }[] = [
        // Bachelor's degree variations
        {
            check: /bachelor'?s?\s*(degree)?|undergraduate|b\.?s\.?|b\.?a\.?|bsc|bba|undergrad/i,
            patterns: [
                /bachelor'?s?\s*(of\s+)?(science|arts|business|engineering|technology)?/i,
                /\bb\.?s\.?\b/i,
                /\bb\.?a\.?\b/i,
                /\bbsc\b/i,
                /\bbba\b/i,
                /undergraduate\s*degree/i,
                /4[\s-]?year\s*degree/i,
                /university\s*degree/i,
            ]
        },
        // Master's degree variations  
        {
            check: /master'?s?\s*(degree)?|graduate\s*degree|m\.?s\.?|m\.?a\.?|mba|msc/i,
            patterns: [
                /master'?s?\s*(of\s+)?(science|arts|business|engineering|technology)?/i,
                /\bm\.?s\.?\b/i,
                /\bm\.?a\.?\b/i,
                /\bmsc\b/i,
                /\bmba\b/i,
                /graduate\s*degree/i,
            ]
        },
        // PhD/Doctorate variations
        {
            check: /ph\.?d\.?|doctorate|doctoral/i,
            patterns: [
                /ph\.?d\.?/i,
                /doctorate/i,
                /doctoral\s*degree/i,
                /doctor\s+of\s+philosophy/i,
            ]
        },
        // Associate's degree
        {
            check: /associate'?s?\s*(degree)?|a\.?a\.?|a\.?s\.?|2[\s-]?year\s*degree/i,
            patterns: [
                /associate'?s?\s*(of\s+)?(science|arts|applied)?/i,
                /\ba\.?a\.?\b/i,
                /\ba\.?s\.?\b/i,
                /2[\s-]?year\s*degree/i,
            ]
        },
    ];

    // Check if the keyword is asking for a degree
    for (const category of degreePatterns) {
        if (category.check.test(keywordLower)) {
            // Keyword is asking for this type of degree, check if resume has it
            for (const pattern of category.patterns) {
                const match = resumeText.match(pattern);
                if (match) {
                    return { matched: true, matchedTerm: match[0] };
                }
            }
        }
    }

    return { matched: false };
}

// Step 3: Calculate Score
export function calculateDetailedScore(
    criticalMatches: KeywordMatchResult[],
    importantMatches: KeywordMatchResult[],
    bonusMatches: KeywordMatchResult[],
    semanticMetrics: SemanticMetrics = { keywordsProcessed: 0, keywordsUpgraded: 0, upgradeRatio: 0 },
    candidateSkillPool?: string[]
): AtsScoreResult {

    const calcCat = (matches: KeywordMatchResult[]): CategoryResult => {
        if (!matches.length) return { score: 100, totalKeywords: 0, matchedCount: 0, matches: [] }; // Default to 100 if no requirements

        const totalScore = matches.reduce((sum, m) => sum + m.score, 0);
        const score = Math.round((totalScore / matches.length) * 100);
        const matchedCount = matches.filter(m => m.score > 0).length;

        return { score, totalKeywords: matches.length, matchedCount, matches };
    };

    const critical = calcCat(criticalMatches);
    const important = calcCat(importantMatches);
    const bonus = calcCat(bonusMatches);

    // Weighted Formula
    // 40% Critical + 35% Important + 25% Bonus
    // Adjust weights if categories are empty
    let wCritical = 0.4, wImportant = 0.35, wBonus = 0.25;

    if (important.totalKeywords === 0) { wCritical += 0.2; wBonus += 0.15; }
    if (bonus.totalKeywords === 0) { wCritical += 0.15; wImportant += 0.1; }

    const finalScore = Math.round(
        (critical.score * wCritical) +
        (important.score * wImportant) +
        (bonus.score * wBonus)
    );

    // Interpretation
    let interpretation = 'Weak Match (<40%)';
    if (finalScore >= 90) interpretation = 'Excellent Match (90-100%)';
    else if (finalScore >= 75) interpretation = 'Good Match (75-89%)';
    else if (finalScore >= 60) interpretation = 'Moderate Match (60-74%)';
    else if (finalScore >= 40) interpretation = 'Average Match (40-59%)';

    // Collect gaps (only critical and important - nice_to_have are optional)
    const gaps: string[] = [];
    criticalMatches.filter(m => m.score === 0).forEach(m => gaps.push(m.keyword.term));
    importantMatches.filter(m => m.score === 0).forEach(m => gaps.push(m.keyword.term));
    // Note: nice_to_have (bonus) keywords are intentionally excluded from gaps
    // as they are optional and shouldn't be reported as "missing skills"

    // Generate truth-grounded improvements (capped at 5)
    const improvements: GroundedImprovement[] = [];
    const maxImprovements = 5;
    const skillPoolSet = new Set((candidateSkillPool || []).map(s => s.toLowerCase()));

    // Helper to check if skill is in candidate's pool
    const isVerifiedSkill = (keyword: string): boolean => {
        const kw = keyword.toLowerCase();
        return skillPoolSet.has(kw) ||
            Array.from(skillPoolSet).some(s => s.includes(kw) || kw.includes(s));
    };

    // Process critical gaps first (max 3)
    criticalMatches.filter(m => m.score === 0).slice(0, 3).forEach(m => {
        const keyword = m.keyword.term;
        const verified = isVerifiedSkill(keyword);

        if (verified) {
            improvements.push({
                keyword,
                priority: 'critical',
                suggestion: `Your profile includes "${keyword}" experience — ensure it's visible in your skills section`,
                isVerifiedSkill: true,
            });
        } else {
            improvements.push({
                keyword,
                priority: 'critical',
                suggestion: `This role requires "${keyword}" — consider if any experience demonstrates this competency`,
                isVerifiedSkill: false,
            });
        }
    });

    // Process important gaps (max 2 more)
    const remainingSlots = maxImprovements - improvements.length;
    importantMatches.filter(m => m.score === 0).slice(0, remainingSlots).forEach(m => {
        const keyword = m.keyword.term;
        const verified = isVerifiedSkill(keyword);

        improvements.push({
            keyword,
            priority: 'important',
            suggestion: verified
                ? `Consider highlighting your "${keyword}" background more prominently`
                : `"${keyword}" is preferred — evaluate if you have transferable experience`,
            isVerifiedSkill: verified,
        });
    });

    // Generate strengths
    const criticalStrengths = criticalMatches
        .filter(m => m.score >= 0.9)
        .slice(0, 3)
        .map(m => m.keyword.term);

    const importantStrengths = importantMatches
        .filter(m => m.score >= 0.9)
        .slice(0, 2)
        .map(m => m.keyword.term);

    const strengths: string[] = [];

    if (criticalStrengths.length >= 2) {
        strengths.push(`Strong coverage of core requirements: ${criticalStrengths.join(', ')}`);
    } else if (criticalStrengths.length === 1) {
        strengths.push(`Demonstrates expertise in ${criticalStrengths[0]}`);
    }

    if (importantStrengths.length >= 1) {
        strengths.push(`Also matches preferred qualifications: ${importantStrengths.join(', ')}`);
    }

    if (critical.matchedCount >= critical.totalKeywords * 0.8) {
        strengths.push('Excellent alignment with job requirements');
    }

    if (strengths.length === 0) {
        strengths.push('Some relevant experience demonstrated');
    }

    return {
        finalScore,
        scoreInterpretation: interpretation,
        recommendation: finalScore > 75 ? 'Safe to apply.' : 'Consider addressing gaps before applying.',
        categoryBreakdown: {
            critical,
            important,
            nice_to_have: bonus
        },
        strengths,
        gaps,
        actionableImprovements: improvements,
        semanticMetrics,
    };
}

// Main Orchestrator
export async function runAtsScore(jobDescription: string, resumeText: string, candidateSkillPool?: string[]): Promise<AtsScoreResult> {
    const extracted = await extractJdKeywords(jobDescription);

    // Step 1: Deterministic matching
    let criticalRes = analyzeKeywordMatches(resumeText, extracted.critical);
    let importantRes = analyzeKeywordMatches(resumeText, extracted.important);
    const bonusRes = analyzeKeywordMatches(resumeText, extracted.nice_to_have);

    // Step 2: Enhance with semantic matching for missing keywords (returns metrics)
    const criticalSemantic = await enhanceWithSemanticMatching(criticalRes, resumeText);
    const importantSemantic = await enhanceWithSemanticMatching(importantRes, resumeText);
    // Skip semantic for bonus (not worth the latency)

    criticalRes = criticalSemantic.enhanced;
    importantRes = importantSemantic.enhanced;

    // Combine semantic metrics from both passes
    const combinedMetrics: SemanticMetrics = {
        keywordsProcessed: criticalSemantic.metrics.keywordsProcessed + importantSemantic.metrics.keywordsProcessed,
        keywordsUpgraded: criticalSemantic.metrics.keywordsUpgraded + importantSemantic.metrics.keywordsUpgraded,
        upgradeRatio: (criticalSemantic.metrics.keywordsProcessed + importantSemantic.metrics.keywordsProcessed) > 0
            ? (criticalSemantic.metrics.keywordsUpgraded + importantSemantic.metrics.keywordsUpgraded) /
            (criticalSemantic.metrics.keywordsProcessed + importantSemantic.metrics.keywordsProcessed)
            : 0,
    };

    return calculateDetailedScore(criticalRes, importantRes, bonusRes, combinedMetrics, candidateSkillPool);
}
