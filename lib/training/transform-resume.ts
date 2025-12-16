/**
 * Resume Text Transformer
 * 
 * Transforms raw resume text into structured ResumeContent format
 * matching the gold-output.json schema.
 */

import type { TrainingResume, Experience, Education, Certification } from './dataset-schema';

// ============================================================================
// Section Detection Patterns
// ============================================================================

const SECTION_PATTERNS = {
    summary: /(?:summary|objective|profile|about\s*me|professional\s*summary)[:\s]*/i,
    experience: /(?:experience|work\s*history|employment|professional\s*experience)[:\s]*/i,
    education: /(?:education|academic|qualifications|degrees?)[:\s]*/i,
    skills: /(?:skills|technical\s*skills|core\s*competencies|expertise|proficiencies)[:\s]*/i,
    certifications: /(?:certifications?|licenses?|credentials?|certificates?)[:\s]*/i,
};

const DATE_PATTERNS = [
    // "Jan 2020 - Present", "January 2020 to Dec 2023"
    /(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s*\d{4}/gi,
    // "2020 - 2023", "2020 to Present"
    /\b(19|20)\d{2}\b/g,
    // "Present", "Current"
    /\b(present|current|now)\b/gi,
];

const BULLET_MARKERS = /^[\s]*[-•●○▪▸►◆★✓→]\s*/;

// ============================================================================
// Main Transformer Function
// ============================================================================

export function transformResumeText(
    rawText: string,
    options: {
        category?: string;
        source?: string;
    } = {}
): TrainingResume | null {
    if (!rawText || rawText.length < 100) {
        return null;
    }

    try {
        // Normalize whitespace
        const text = normalizeText(rawText);

        // Split into sections
        const sections = extractSections(text);

        // Parse each section
        const experience = parseExperienceSection(sections.experience);
        const education = parseEducationSection(sections.education);
        const skills = parseSkillsSection(sections.skills);
        const certifications = parseCertificationsSection(sections.certifications);
        const summary = parseSummarySection(sections.summary);

        // Validate minimum requirements
        if (experience.length === 0 && skills.length === 0) {
            return null;
        }

        return {
            summary: summary || undefined,
            experience,
            skills,
            education: education.length > 0 ? education : undefined,
            certifications: certifications.length > 0 ? certifications : undefined,
            category: options.category,
            source: options.source,
            qualityScore: calculateQualityScore({ experience, skills, education, summary }),
        };
    } catch (error) {
        console.error('Failed to transform resume text:', error);
        return null;
    }
}

// ============================================================================
// Text Normalization
// ============================================================================

function normalizeText(text: string): string {
    return text
        // Normalize line breaks
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        // Remove excessive whitespace
        .replace(/[ \t]+/g, ' ')
        // Remove excessive newlines (keep max 2)
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

// ============================================================================
// Section Extraction
// ============================================================================

interface SectionMap {
    summary: string;
    experience: string;
    education: string;
    skills: string;
    certifications: string;
    other: string;
}

function extractSections(text: string): SectionMap {
    const sections: SectionMap = {
        summary: '',
        experience: '',
        education: '',
        skills: '',
        certifications: '',
        other: '',
    };

    const lines = text.split('\n');
    let currentSection: keyof SectionMap = 'other';
    let buffer: string[] = [];

    for (const line of lines) {
        const trimmedLine = line.trim();

        // Check if this line is a section header
        let foundSection: keyof SectionMap | null = null;

        for (const [section, pattern] of Object.entries(SECTION_PATTERNS)) {
            if (pattern.test(trimmedLine) && trimmedLine.length < 50) {
                foundSection = section as keyof SectionMap;
                break;
            }
        }

        if (foundSection) {
            // Save current buffer to previous section
            if (buffer.length > 0) {
                sections[currentSection] += buffer.join('\n') + '\n';
                buffer = [];
            }
            currentSection = foundSection;
        } else {
            buffer.push(line);
        }
    }

    // Save remaining buffer
    if (buffer.length > 0) {
        sections[currentSection] += buffer.join('\n');
    }

    // If no sections detected, try heuristic parsing
    if (!sections.experience && !sections.skills) {
        return extractSectionsHeuristic(text);
    }

    return sections;
}

function extractSectionsHeuristic(text: string): SectionMap {
    const sections: SectionMap = {
        summary: '',
        experience: '',
        education: '',
        skills: '',
        certifications: '',
        other: text,
    };

    // Try to find experience by looking for company/date patterns
    const experienceMatch = text.match(/(?:company\s*name|city\s*state|experience)[:\s]*([\s\S]*?)(?:education|skills|$)/i);
    if (experienceMatch) {
        sections.experience = experienceMatch[1];
    }

    // Try to find skills by looking for skill lists
    const skillsMatch = text.match(/skills[:\s]*([\s\S]*?)(?:education|experience|$)/i);
    if (skillsMatch) {
        sections.skills = skillsMatch[1];
    }

    return sections;
}

// ============================================================================
// Experience Parsing
// ============================================================================

function parseExperienceSection(text: string): Experience[] {
    if (!text || text.trim().length < 20) {
        return [];
    }

    const experiences: Experience[] = [];
    const lines = text.split('\n').filter(l => l.trim());

    let currentExperience: Partial<Experience> | null = null;
    let bullets: string[] = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // Skip empty lines
        if (!line) continue;

        // Check if this looks like a job title/company line
        const hasDate = DATE_PATTERNS.some(p => p.test(line));
        const isBullet = BULLET_MARKERS.test(line);
        const isLikelyHeader = !isBullet && (
            hasDate ||
            line.includes('Company Name') ||
            line.includes('City State') ||
            /^[A-Z][a-z]+\s+[A-Z]/.test(line) // Title Case pattern
        );

        if (isLikelyHeader && !isBullet) {
            // Save previous experience
            if (currentExperience && bullets.length > 0) {
                experiences.push({
                    company: currentExperience.company || 'Unknown Company',
                    title: currentExperience.title || 'Unknown Title',
                    location: currentExperience.location,
                    startDate: currentExperience.startDate,
                    endDate: currentExperience.endDate,
                    bullets: bullets.slice(0, 8), // Cap at 8 bullets
                });
            }

            // Parse new experience header
            currentExperience = parseExperienceHeader(line, lines[i + 1]);
            bullets = [];
        } else if (isBullet) {
            const bulletText = line.replace(BULLET_MARKERS, '').trim();
            if (bulletText.length >= 20) {
                bullets.push(bulletText);
            }
        } else if (currentExperience && line.length > 30) {
            // Might be a continuation or a bullet without marker
            bullets.push(line);
        }
    }

    // Save last experience
    if (currentExperience && bullets.length > 0) {
        experiences.push({
            company: currentExperience.company || 'Unknown Company',
            title: currentExperience.title || 'Unknown Title',
            location: currentExperience.location,
            startDate: currentExperience.startDate,
            endDate: currentExperience.endDate,
            bullets: bullets.slice(0, 8),
        });
    }

    return experiences;
}

function parseExperienceHeader(line: string, nextLine?: string): Partial<Experience> {
    const experience: Partial<Experience> = {};

    // Extract dates
    const dateMatch = line.match(/(\d{1,2}\/\d{4}|\w+\s*\d{4})\s*(?:to|-|–)\s*(\d{1,2}\/\d{4}|\w+\s*\d{4}|present|current)/i);
    if (dateMatch) {
        experience.startDate = dateMatch[1];
        experience.endDate = dateMatch[2];
    }

    // Extract company name (often in ALL CAPS or followed by location)
    const companyMatch = line.match(/([A-Z][A-Z\s&]+(?:INC|LLC|CORP|CO)?)|Company\s*Name\s*[:\s]*([^,\n]+)/i);
    if (companyMatch) {
        experience.company = (companyMatch[1] || companyMatch[2])?.trim();
    }

    // Extract title
    const titleMatch = line.match(/^([A-Za-z\s]+(?:Manager|Analyst|Developer|Engineer|Director|Lead|Specialist|Associate|Coordinator|Consultant))/i);
    if (titleMatch) {
        experience.title = titleMatch[1].trim();
    }

    // Extract location
    const locationMatch = line.match(/(?:City\s*,?\s*State|([A-Z][a-z]+,?\s*[A-Z]{2}))/);
    if (locationMatch) {
        experience.location = locationMatch[1] || locationMatch[0];
    }

    // If title not found, check next line
    if (!experience.title && nextLine && !BULLET_MARKERS.test(nextLine)) {
        experience.title = nextLine.trim().split(/[,|]/)[0];
    }

    return experience;
}

// ============================================================================
// Education Parsing
// ============================================================================

function parseEducationSection(text: string): Education[] {
    if (!text || text.trim().length < 20) {
        return [];
    }

    const education: Education[] = [];
    const lines = text.split('\n').filter(l => l.trim());

    for (const line of lines) {
        const trimmedLine = line.trim();

        // Look for degree patterns
        const degreeMatch = trimmedLine.match(
            /(Bachelor'?s?|Master'?s?|Ph\.?D\.?|MBA|B\.?S\.?|M\.?S\.?|Associate'?s?|Doctorate)\s*(?:of|in)?\s*([\w\s]+)?/i
        );

        if (degreeMatch) {
            const edu: Education = {
                institution: '',
                degree: degreeMatch[1],
                field: degreeMatch[2]?.trim(),
            };

            // Look for institution name
            const institutionMatch = trimmedLine.match(
                /(University|College|Institute|School)\s*(?:of\s*)?[\w\s]+/i
            );
            if (institutionMatch) {
                edu.institution = institutionMatch[0].trim();
            }

            // Look for year
            const yearMatch = trimmedLine.match(/\b(19|20)\d{2}\b/);
            if (yearMatch) {
                edu.endDate = yearMatch[0];
            }

            if (edu.institution || edu.degree) {
                education.push(edu);
            }
        }
    }

    return education;
}

// ============================================================================
// Skills Parsing
// ============================================================================

function parseSkillsSection(text: string): string[] {
    if (!text || text.trim().length < 10) {
        return [];
    }

    const skills: string[] = [];
    const seen = new Set<string>();

    // Split by common delimiters
    const parts = text.split(/[,;|•●○▪\n]+/);

    for (const part of parts) {
        const skill = part
            .trim()
            .replace(/^\s*[-:]\s*/, '')
            .replace(/\s+/g, ' ');

        // Skip if too short, too long, or contains unwanted patterns
        if (
            skill.length >= 2 &&
            skill.length <= 50 &&
            !skill.match(/^\d+$/) &&
            !skill.match(/^(and|or|the|with|for|to|of|in|a|an)$/i)
        ) {
            const normalized = skill.toLowerCase();
            if (!seen.has(normalized)) {
                seen.add(normalized);
                skills.push(skill);
            }
        }
    }

    return skills.slice(0, 60); // Cap at 60 skills
}

// ============================================================================
// Certifications Parsing
// ============================================================================

function parseCertificationsSection(text: string): Certification[] {
    if (!text || text.trim().length < 10) {
        return [];
    }

    const certifications: Certification[] = [];
    const lines = text.split('\n').filter(l => l.trim());

    for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine.length < 5) continue;

        const cert: Certification = {
            name: trimmedLine.replace(/\s*\d{4}\s*$/, '').trim(),
        };

        // Extract year if present
        const yearMatch = trimmedLine.match(/\b(19|20)\d{2}\b/);
        if (yearMatch) {
            cert.date = yearMatch[0];
        }

        if (cert.name.length >= 5) {
            certifications.push(cert);
        }
    }

    return certifications.slice(0, 10); // Cap at 10 certifications
}

// ============================================================================
// Summary Parsing
// ============================================================================

function parseSummarySection(text: string): string | null {
    if (!text || text.trim().length < 50) {
        return null;
    }

    // Clean up the summary
    const summary = text
        .trim()
        .replace(/^(summary|objective|profile|about\s*me)[:\s]*/i, '')
        .replace(/\n+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    // Ensure minimum length and no bullet points
    if (summary.length >= 50 && !BULLET_MARKERS.test(summary)) {
        return summary.slice(0, 1000); // Cap at 1000 chars
    }

    return null;
}

// ============================================================================
// Quality Score Calculation
// ============================================================================

interface QualityInput {
    experience: Experience[];
    skills: string[];
    education: Education[];
    summary: string | null;
}

function calculateQualityScore(input: QualityInput): number {
    let score = 0;
    const maxScore = 100;

    // Experience (40 points max)
    if (input.experience.length > 0) {
        score += Math.min(20, input.experience.length * 5); // Up to 20 for count

        // Quality of bullets
        const totalBullets = input.experience.reduce((sum, exp) => sum + exp.bullets.length, 0);
        const avgBulletsPerExp = totalBullets / input.experience.length;
        score += Math.min(10, avgBulletsPerExp * 2); // Up to 10 for bullet count

        // Check for metrics in bullets
        const bulletsWithMetrics = input.experience.flatMap(exp => exp.bullets)
            .filter(b => /\d+%|\$\d+|\d+\+/.test(b));
        score += Math.min(10, bulletsWithMetrics.length * 2); // Up to 10 for metrics
    }

    // Skills (25 points max)
    if (input.skills.length > 0) {
        score += Math.min(15, input.skills.length / 2); // Up to 15 for count
        score += input.skills.length >= 10 ? 10 : input.skills.length; // Up to 10 for variety
    }

    // Education (15 points max)
    if (input.education.length > 0) {
        score += 10;
        if (input.education.some(e => e.degree)) score += 5;
    }

    // Summary (20 points max)
    if (input.summary) {
        score += Math.min(10, input.summary.length / 50); // Length
        if (input.summary.length >= 200) score += 5;
        if (/\d+\+?\s*(years?|months?)/.test(input.summary)) score += 5; // Has experience mention
    }

    return Math.min(1, score / maxScore);
}
