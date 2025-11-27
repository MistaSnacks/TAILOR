import { genAI } from '../gemini';
import {
  DEFAULT_PARSED_JOB_DESCRIPTION,
  ensureParsedJobDescription,
  type ParsedJobDescription,
} from './job-types';

export type ParsedExperience = {
    company: string;
    title: string;
    location?: string;
    startDate?: string;
    endDate?: string;
    isCurrent?: boolean;
    bullets: string[];
};

export type ParsedEducation = {
    institution: string;
    degree: string;
    field?: string;
    startDate?: string;
    endDate?: string;
    graduationDate?: string;
    gpa?: string;
    honors?: string[];
};

export type ParsedCertification = {
    name: string;
    issuer?: string;
    date?: string;
    expirationDate?: string;
    credentialId?: string;
};

export type ParsedResumeData = {
    experiences: ParsedExperience[];
    skills: string[];
    education: ParsedEducation[];
    certifications: ParsedCertification[];
    summary?: string;
    contactInfo?: {
        name?: string;
        email?: string;
        phone?: string;
        linkedin?: string;
        portfolio?: string;
        location?: string; // Extracted but NOT used in resume output
    };
};

export async function parseResumeToJSON(text: string): Promise<ParsedResumeData> {
    if (!genAI) {
        throw new Error('Gemini API key not configured');
    }

    const model = genAI.getGenerativeModel({
        model: 'gemini-2.0-flash-exp',
        generationConfig: {
            responseMimeType: "application/json",
        }
    });

    const prompt = `You are an expert resume parser. Extract ALL structured data from the provided resume text.

Resume Text:
${text}

Output JSON with this COMPLETE structure:
{
  "contactInfo": {
    "name": "Full Name",
    "email": "email@example.com",
    "phone": "phone number",
    "linkedin": "linkedin URL or username",
    "portfolio": "portfolio/website URL if present",
    "location": "City, State (for internal use only)"
  },
  "summary": "Professional summary paragraph if present",
  "experiences": [
    {
      "company": "Company Name",
      "title": "Job Title",
      "location": "City, State (optional)",
      "startDate": "YYYY-MM or YYYY",
      "endDate": "YYYY-MM or Present",
      "isCurrent": boolean,
      "bullets": ["list of bullet points"]
    }
  ],
  "education": [
    {
      "institution": "University/College Name",
      "degree": "Bachelor of Science, Master of Arts, etc.",
      "field": "Major/Field of Study",
      "startDate": "YYYY-MM or YYYY (if available)",
      "endDate": "YYYY-MM or YYYY or Present (if available)",
      "graduationDate": "YYYY-MM or YYYY or 'Expected YYYY' (use if start/end not available)",
      "gpa": "GPA if mentioned",
      "honors": ["Dean's List", "Cum Laude", etc.]
    }
  ],
  "certifications": [
    {
      "name": "Certification Name",
      "issuer": "Issuing Organization",
      "date": "YYYY-MM or YYYY",
      "expirationDate": "YYYY-MM if applicable",
      "credentialId": "ID if mentioned"
    }
  ],
  "skills": ["list of skill phrases"]
}

Rules:
1. Normalize dates to YYYY-MM format if possible, otherwise YYYY.
2. If a job is current, set isCurrent to true and endDate to "Present".
3. Extract skills as individual phrases (e.g., "React", "Project Management").
4. Clean up bullet points (remove leading bullets/dashes).
5. Extract ALL education entries, even partial (bootcamps, courses count).
6. Extract ALL certifications, licenses, and professional credentials.
7. If summary/objective exists, extract it; otherwise leave empty string.
8. Return empty arrays for sections with no data, not null.
`;

    try {
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        return JSON.parse(responseText) as ParsedResumeData;
    } catch (error) {
        console.error('Error parsing resume with Gemini:', error);
        throw new Error('Failed to parse resume');
    }
}

type JobParsingInput = {
    title?: string;
    description: string;
};

const JOB_CONTEXT_PROMPT = `You are an expert ATS keyword analyst. Extract ALL keywords and phrases that an ATS system would scan for.

Return tight JSON with:
- normalizedTitle: concise role title (no company, no level words like "Lead" unless crucial)
- level: one of ["IC","Senior IC","Manager","Director","VP","Executive"]
- domain: dominant problem space (e.g. "fintech fraud", "trust & safety", "non-profit ops")
- responsibilities: up to 12 action items capturing scope/outcomes (use exact phrasing from JD)
- hardSkills: array of 30-50 technical keywords including:
  * Tools & software (SQL, Python, Excel, Tableau, Salesforce, etc.)
  * Platforms & systems (AWS, Stripe, billing systems, CRM, etc.)
  * Methodologies (Agile, Six Sigma, process improvement, etc.)
  * Regulations & compliance (SOX, GDPR, PCI, KYC, AML, etc.)
  * Technical concepts (data analysis, ETL, API, automation, etc.)
  * Include BOTH single words AND multi-word phrases (e.g., "cross-functional collaboration", "data-driven")
  * Include common variations (e.g., both "MS Excel" and "Excel")
- softSkills: array of 15-20 soft skill keywords including:
  * Communication traits (written communication, verbal communication, presentation skills)
  * Collaboration (cross-functional, stakeholder management, team collaboration)
  * Leadership (mentoring, coaching, leading teams)
  * Problem-solving (analytical thinking, critical thinking, troubleshooting)
  * Work style (detail-oriented, self-starter, fast-paced environment)
- queries: 5-8 semantic search phrases (<80 chars) for retrieval
- keyPhrases: array of 10-15 exact multi-word phrases from the JD that are important (e.g., "attention to detail", "client-facing", "high-growth environment")`;

export async function parseJobDescriptionToContext(
    job: JobParsingInput
): Promise<ParsedJobDescription> {
    if (!genAI) {
        throw new Error('Gemini API key not configured');
    }

    const description = job.description?.trim();

    if (!description) {
        return {
            ...DEFAULT_PARSED_JOB_DESCRIPTION,
            normalizedTitle: job.title?.trim() || '',
            queries: deriveFallbackQueries(job),
        };
    }

    try {
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.0-flash-exp',
            generationConfig: {
                responseMimeType: 'application/json',
                temperature: 0.1,
            },
        });

        const prompt = `${JOB_CONTEXT_PROMPT}

Job Title: ${job.title || 'Unknown'}

Job Description (truncated to 7000 chars):
${description.slice(0, 7000)}
`;

        const result = await model.generateContent(prompt);
        const parsed = JSON.parse(result.response.text());
        const ensured = ensureParsedJobDescription(parsed);

        return {
            ...DEFAULT_PARSED_JOB_DESCRIPTION,
            ...ensured,
            normalizedTitle: ensured.normalizedTitle || job.title?.trim() || '',
            queries:
                ensured.queries.length > 0
                    ? ensured.queries.slice(0, 5)
                    : deriveFallbackQueries(job, ensured),
        };
    } catch (error) {
        console.error('❌ Failed to parse job description context:', error);
        return {
            ...DEFAULT_PARSED_JOB_DESCRIPTION,
            normalizedTitle: job.title?.trim() || '',
            queries: deriveFallbackQueries(job),
        };
    }
}

function deriveFallbackQueries(
    job: JobParsingInput,
    parsed?: ParsedJobDescription
): string[] {
    const keywords = new Set<string>();
    const addTokens = (value?: string, options: { allowShort?: boolean } = {}) => {
        if (!value) return;
        value
            .toLowerCase()
            .split(/[^a-z0-9%+#/]+/)
            .map((token) => token.trim())
            .filter((token) => token.length >= (options.allowShort ? 3 : 4))
            .slice(0, 6)
            .forEach((token) => keywords.add(token));
    };

    addTokens(job.title);
    parsed?.hardSkills?.slice(0, 6).forEach((skill) => keywords.add(skill.toLowerCase()));
    parsed?.responsibilities?.slice(0, 4).forEach((resp) => addTokens(resp));

    if (job.description) {
        addTokens(job.description.split('\n').slice(0, 5).join(' '), { allowShort: true });
    }

    const queries = Array.from(keywords)
        .filter(Boolean)
        .map((token) => token.slice(0, 80));

    if (!queries.length && job.title) {
        return [job.title.trim().slice(0, 80)];
    }

    return queries.slice(0, 5);
}

export type { ParsedJobDescription } from './job-types';
