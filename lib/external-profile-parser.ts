/**
 * External Profile Parser
 * 
 * Fetches and parses content from LinkedIn profiles and portfolio websites
 * to extract experiences, skills, and projects for resume generation.
 * 
 * Uses Firecrawl for scraping and Gemini for structured extraction.
 */

import { genAI } from './gemini';

export type ExternalExperience = {
  company: string;
  title: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  isCurrent?: boolean;
  description?: string;
  bullets: string[];
};

export type ExternalProject = {
  name: string;
  description: string;
  url?: string;
  technologies: string[];
  bullets: string[];
  startDate?: string;
  endDate?: string;
};

export type ExternalEducation = {
  institution: string;
  degree?: string;
  field?: string;
  startDate?: string;
  endDate?: string;
};

export type ExternalCertification = {
  name: string;
  issuer?: string;
  date?: string;
};

export type ParsedExternalProfile = {
  source: 'linkedin' | 'portfolio';
  sourceUrl: string;
  name?: string;
  headline?: string;
  summary?: string;
  experiences: ExternalExperience[];
  projects: ExternalProject[];
  skills: string[];
  education: ExternalEducation[];
  certifications: ExternalCertification[];
  rawContent?: string;
};

/**
 * Parse LinkedIn profile content using Gemini
 */
export async function parseLinkedInContent(
  markdown: string,
  sourceUrl: string
): Promise<ParsedExternalProfile> {
  if (!genAI) {
    throw new Error('Gemini API key not configured');
  }

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.1,
    },
  });

  const prompt = `You are an expert at parsing LinkedIn profile content. Extract structured data from this LinkedIn profile.

LinkedIn Profile Content:
${markdown.slice(0, 15000)}

Extract the following information. Be thorough and capture ALL experiences, projects, and skills mentioned:

1. **Personal Info**: name, headline/title, summary/about section
2. **Experiences**: ALL work experiences with company, title, dates, location, and bullet points/description
3. **Projects**: Any featured projects or portfolio items
4. **Skills**: ALL skills mentioned (both endorsed and listed)
5. **Education**: Schools, degrees, fields, dates
6. **Certifications**: Any certifications or licenses

For experiences and projects, convert any paragraph descriptions into bullet points that follow the Action + Context + Result format.

Return ONLY valid JSON matching this schema:
{
  "name": "Full Name",
  "headline": "Professional headline/title",
  "summary": "About/summary section text",
  "experiences": [
    {
      "company": "Company Name",
      "title": "Job Title",
      "location": "City, State/Country",
      "startDate": "Month Year (e.g., Jan 2020)",
      "endDate": "Month Year or null if current",
      "isCurrent": true/false,
      "description": "Role description if available",
      "bullets": ["Achievement bullet 1", "Achievement bullet 2"]
    }
  ],
  "projects": [
    {
      "name": "Project Name",
      "description": "Brief description",
      "url": "Project URL if available",
      "technologies": ["Tech1", "Tech2"],
      "bullets": ["What you built/achieved"],
      "startDate": "Month Year",
      "endDate": "Month Year"
    }
  ],
  "skills": ["Skill1", "Skill2", "Skill3"],
  "education": [
    {
      "institution": "School Name",
      "degree": "Degree Type",
      "field": "Field of Study",
      "startDate": "Year",
      "endDate": "Year"
    }
  ],
  "certifications": [
    {
      "name": "Certification Name",
      "issuer": "Issuing Organization",
      "date": "Month Year"
    }
  ]
}

IMPORTANT:
- Extract ALL experiences, not just recent ones
- Convert descriptions to bullet points where possible
- Preserve exact company names and titles
- Include all skills, even if just mentioned in skills section
- If a field is not found, use null or empty array`;

  const result = await model.generateContent(prompt);
  const responseText = result.response.text();

  try {
    const parsed = JSON.parse(responseText);
    
    return {
      source: 'linkedin',
      sourceUrl,
      name: parsed.name || undefined,
      headline: parsed.headline || undefined,
      summary: parsed.summary || undefined,
      experiences: Array.isArray(parsed.experiences) ? parsed.experiences : [],
      projects: Array.isArray(parsed.projects) ? parsed.projects : [],
      skills: Array.isArray(parsed.skills) ? parsed.skills : [],
      education: Array.isArray(parsed.education) ? parsed.education : [],
      certifications: Array.isArray(parsed.certifications) ? parsed.certifications : [],
      rawContent: markdown.slice(0, 5000), // Store truncated for debugging
    };
  } catch (error) {
    console.error('Failed to parse LinkedIn content:', error);
    throw new Error('Failed to parse LinkedIn profile content');
  }
}

/**
 * Parse portfolio website content using Gemini
 */
export async function parsePortfolioContent(
  markdown: string,
  sourceUrl: string
): Promise<ParsedExternalProfile> {
  if (!genAI) {
    throw new Error('Gemini API key not configured');
  }

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.1,
    },
  });

  const prompt = `You are an expert at parsing portfolio websites. Extract structured data from this portfolio/personal website.

Portfolio Website Content:
${markdown.slice(0, 15000)}

Extract the following information. Focus on projects, skills, and any work experience mentioned:

1. **Personal Info**: name, title/role, bio/about
2. **Projects**: ALL projects mentioned with descriptions, technologies, and achievements
3. **Skills**: ALL technologies, tools, and skills mentioned
4. **Experiences**: Any work experience mentioned (if this is also a resume site)
5. **Education**: If mentioned
6. **Certifications**: If mentioned

For projects, create bullet points describing what was built and the impact.

Return ONLY valid JSON matching this schema:
{
  "name": "Full Name",
  "headline": "Professional title/role",
  "summary": "Bio/about section",
  "experiences": [
    {
      "company": "Company Name",
      "title": "Job Title",
      "location": "Location",
      "startDate": "Month Year",
      "endDate": "Month Year or null",
      "isCurrent": true/false,
      "description": "Description",
      "bullets": ["Achievement bullet"]
    }
  ],
  "projects": [
    {
      "name": "Project Name",
      "description": "What it does",
      "url": "Live URL or GitHub",
      "technologies": ["React", "Node.js", "PostgreSQL"],
      "bullets": ["Built X that does Y resulting in Z"],
      "startDate": null,
      "endDate": null
    }
  ],
  "skills": ["JavaScript", "Python", "AWS"],
  "education": [],
  "certifications": []
}

IMPORTANT:
- Extract ALL projects, not just featured ones
- Infer technologies from project descriptions if not explicitly listed
- Create achievement-oriented bullet points for projects
- Capture skills from multiple sections (about, skills, project tech stacks)`;

  const result = await model.generateContent(prompt);
  const responseText = result.response.text();

  try {
    const parsed = JSON.parse(responseText);
    
    return {
      source: 'portfolio',
      sourceUrl,
      name: parsed.name || undefined,
      headline: parsed.headline || undefined,
      summary: parsed.summary || undefined,
      experiences: Array.isArray(parsed.experiences) ? parsed.experiences : [],
      projects: Array.isArray(parsed.projects) ? parsed.projects : [],
      skills: Array.isArray(parsed.skills) ? parsed.skills : [],
      education: Array.isArray(parsed.education) ? parsed.education : [],
      certifications: Array.isArray(parsed.certifications) ? parsed.certifications : [],
      rawContent: markdown.slice(0, 5000),
    };
  } catch (error) {
    console.error('Failed to parse portfolio content:', error);
    throw new Error('Failed to parse portfolio website content');
  }
}

/**
 * Determine if a URL is a LinkedIn profile
 */
export function isLinkedInUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.hostname.includes('linkedin.com');
  } catch {
    return false;
  }
}

/**
 * Validate and normalize a URL
 */
export function normalizeUrl(url: string): string {
  let normalized = url.trim();
  
  // Add https:// if no protocol
  if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
    normalized = 'https://' + normalized;
  }
  
  // Validate URL format
  try {
    new URL(normalized);
    return normalized;
  } catch {
    throw new Error('Invalid URL format');
  }
}

