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

export type ParsedResumeData = {
    experiences: ParsedExperience[];
    skills: string[];
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

    const prompt = `You are an expert resume parser. Your task is to extract structured data from the provided resume text.

Resume Text:
${text}

Output JSON with the following structure:
{
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
  "skills": ["list of skill phrases"]
}

Rules:
1. Normalize dates to YYYY-MM format if possible, otherwise YYYY.
2. If a job is current, set isCurrent to true and endDate to "Present".
3. Extract skills as individual phrases (e.g., "React", "Project Management").
4. Clean up bullet points (remove leading bullets/dashes).
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

const JOB_CONTEXT_PROMPT = `You are a hiring analyst. Read the job description and summarize the core signals.

Return tight JSON with:
- normalizedTitle: concise role title (no company, no level words like "Lead" unless crucial)
- level: one of ["IC","Senior IC","Manager","Director","VP","Executive"]
- domain: dominant problem space (e.g. "fintech fraud", "trust & safety", "non-profit ops")
- responsibilities: up to 10 action items capturing scope/outcomes
- hardSkills: tools, platforms, regulations, methodologies (max 15, single tokens)
- softSkills: collaboration/leadership/communication traits (max 8)
- queries: 3-5 short semantic search phrases (<80 chars) the retriever can embed`;

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
