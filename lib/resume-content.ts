export interface ResumeExperience {
  id?: string;
  title: string;
  company: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  isCurrent?: boolean;
  bullets?: string[];
  bulletSources?: string[][];
  description?: string;
}

export interface ResumeEducation {
  degree: string;
  school: string;
  year?: string;
  gpa?: string;
}

export interface ResumeCertification {
  name: string;
  issuer?: string;
  date?: string;
}

export interface ResumeContact {
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  linkedin?: string;
}

export interface ResumeContent {
  summary?: string;
  experience?: ResumeExperience[];
  skills?: string[];
  education?: ResumeEducation[];
  certifications?: ResumeCertification[];
  contact?: ResumeContact;
  meta?: ResumeContentMeta;
}

export interface ResumeContentMeta {
  warnings?: string[];
  filteredExperiences?: FilteredExperience[];
}

export const emptyResumeContent: ResumeContent = {
  summary: '',
  experience: [],
  skills: [],
  education: [],
  certifications: [],
  contact: {},
};

export function normalizeResumeContent(content: any): ResumeContent {
  try {
    if (!content) return { ...emptyResumeContent };

    if (typeof content === 'string') {
      try {
        const parsed = JSON.parse(content);
        return normalizeResumeContent(parsed);
      } catch {
        return {
          ...emptyResumeContent,
          summary: content,
        };
      }
    }

    if (typeof content === 'object') {
      const rawExperiences = Array.isArray(content.experience) ? content.experience : [];
      const experienceValidation = filterEligibleExperiences(rawExperiences);

      return {
        summary: content.summary || '',
        experience: experienceValidation.eligible,
        skills: Array.isArray(content.skills)
          ? content.skills.filter(Boolean)
          : typeof content.skills === 'string'
          ? content.skills.split(/[,•\n]/).map((s: string) => s.trim()).filter(Boolean)
          : [],
        education: Array.isArray(content.education)
          ? content.education.map((edu: any) => ({
              degree: edu.degree || '',
              school: edu.school || '',
              year: edu.year || '',
              gpa: edu.gpa || '',
            }))
          : [],
        certifications: Array.isArray(content.certifications)
          ? content.certifications.map((cert: any) => ({
              name: cert.name || '',
              issuer: cert.issuer || '',
              date: cert.date || '',
            }))
          : [],
        contact: {
          name: content.contact?.name || '',
          email: content.contact?.email || '',
          phone: content.contact?.phone || '',
          location: content.contact?.location || '',
          linkedin: content.contact?.linkedin || '',
        },
        meta:
          experienceValidation.filtered.length || experienceValidation.warnings.length
            ? {
                warnings: experienceValidation.warnings,
                filteredExperiences: experienceValidation.filtered,
              }
            : undefined,
      };
    }

    return { ...emptyResumeContent };
  } catch (error) {
    console.error('Error normalizing resume content:', error);
    return { ...emptyResumeContent };
  }
}

export function stringifyResumeContent(content: ResumeContent) {
  return JSON.stringify(content);
}

export type ExperienceValidationIssue =
  | 'missing_title'
  | 'missing_company'
  | 'missing_start_date'
  | 'missing_end_date'
  | 'placeholder_detected';

export type ExperienceValidationResult = {
  experience: ResumeExperience;
  issues: ExperienceValidationIssue[];
  messages: string[];
  isEligible: boolean;
  hadPlaceholder: boolean;
};

export type FilteredExperience = {
  experience: ResumeExperience;
  issues: ExperienceValidationIssue[];
  messages: string[];
};

const ISSUE_MESSAGES: Record<ExperienceValidationIssue, string> = {
  missing_title: 'Missing role title',
  missing_company: 'Missing company name',
  missing_start_date: 'Missing start date',
  missing_end_date: 'Missing end date or current-role flag',
  placeholder_detected: 'Contains placeholder text',
};

const PLACEHOLDER_EXACT_MATCHES = [
  'company name',
  'your company',
  'job title',
  'position title',
  'insert title',
  'insert company',
  'sample company',
  'sample title',
  'lorem ipsum',
  'placeholder',
  'city, state',
  'location',
  'mm/yyyy',
  'month year',
  'yyyy',
  'yyyy-yyyy',
  '20xx',
  'tbd',
  'n/a',
];

const PLACEHOLDER_REGEXPS = [
  /\{\{.*?\}\}/i,
  /\[\[.*?\]\]/i,
  /<.*?>/i,
  /\bxx+\b/i,
  /\byy+\b/i,
  /\bzz+\b/i,
  /company\s+name/i,
  /job\s+title/i,
  /insert\s+(company|title|role)/i,
  /sample\s+(company|title)/i,
  /city,\s*state/i,
  /mm\/yyyy/i,
  /month\s+year/i,
  /\b20xx\b/i,
  /\byyyy\b/i,
  /\btbd\b/i,
  /\bn\/a\b/i,
];

type ExperienceCandidate = Partial<ResumeExperience> & {
  id?: string;
  start_date?: string;
  end_date?: string;
  is_current?: boolean;
};

export function validateExperienceRecord(candidate: ExperienceCandidate): ExperienceValidationResult {
  const title = scrubField(candidate.title);
  const company = scrubField(candidate.company);
  const location = scrubField(candidate.location);
  const startDate = scrubField(candidate.startDate ?? candidate.start_date);
  const endDate = scrubField(candidate.endDate ?? candidate.end_date);
  const description = scrubField(candidate.description);

  const bulletSanitizations = Array.isArray(candidate.bullets)
    ? candidate.bullets.map((bullet) => {
        if (typeof bullet === 'string') {
          const cleaned = scrubField(bullet);
          return { ...cleaned, sourceIds: [] as string[] };
        }
        if (bullet && typeof bullet === 'object') {
          const cleaned = scrubField(typeof bullet.text === 'string' ? bullet.text : '');
          const sourceIds = Array.isArray((bullet as any).source_ids)
            ? (bullet as any).source_ids.filter((id: unknown) => typeof id === 'string')
            : [];
          return { ...cleaned, sourceIds };
        }
        return scrubField('');
      })
    : [];

  const bullets: string[] = [];
  const bulletSources: string[][] = [];

  bulletSanitizations.forEach((bullet) => {
    if (bullet.value.length > 0) {
      bullets.push(bullet.value);
      bulletSources.push(bullet.sourceIds ?? []);
    }
  });

  const hadPlaceholder =
    title.placeholder ||
    company.placeholder ||
    location.placeholder ||
    startDate.placeholder ||
    endDate.placeholder ||
    description.placeholder ||
    bulletSanitizations.some((bullet) => bullet.placeholder);

  const isCurrentFlag =
    coerceBoolean(candidate.isCurrent) ??
    coerceBoolean(candidate.is_current) ??
    false;

  const experience: ResumeExperience = {
    id: candidate.id,
    title: title.value,
    company: company.value,
    location: location.value,
    startDate: startDate.value,
    endDate: endDate.value,
    isCurrent: isCurrentFlag,
    bullets,
    bulletSources: bulletSources.some((entry) => entry.length) ? bulletSources : undefined,
    description: description.value,
  };

  if (experience.isCurrent && !experience.endDate) {
    experience.endDate = 'Present';
  }

  const issues: ExperienceValidationIssue[] = [];

  const hasTitle = !!experience.title;
  const hasCompany = !!experience.company;
  const hasStart = !!experience.startDate;
  const hasEnd = !!experience.endDate;
  const hasTimeline = hasStart || hasEnd || experience.isCurrent;

  if (!hasTitle) issues.push('missing_title');
  if (!hasCompany) issues.push('missing_company');

  if (!hasTimeline) {
    issues.push('missing_start_date');
  }

  if (!hasEnd && hasStart && !experience.isCurrent) {
    experience.isCurrent = true;
    experience.endDate = 'Present';
  }

  if (!hasEnd && !experience.isCurrent) {
    issues.push('missing_end_date');
  }

  const messages = issues.map((issue) => ISSUE_MESSAGES[issue]);

  return {
    experience,
    issues,
    messages,
    isEligible: !issues.some((issue) => issue === 'missing_title' || issue === 'missing_start_date'),
    hadPlaceholder,
  };
}

export function filterEligibleExperiences(
  experiences: ExperienceCandidate[]
): {
  eligible: ResumeExperience[];
  filtered: FilteredExperience[];
  warnings: string[];
} {
  if (!Array.isArray(experiences)) {
    return { eligible: [], filtered: [], warnings: [] };
  }

  const results = experiences
    .filter(Boolean)
    .map((exp) => validateExperienceRecord(exp as ExperienceCandidate));

  const eligible = results.filter((result) => result.isEligible).map((result) => result.experience);

  const filtered = results
    .filter((result) => !result.isEligible)
    .map((result) => ({
      experience: result.experience,
      issues: result.issues,
      messages: result.messages,
    }));

  const warnings = filtered.map((entry) =>
    buildWarning(entry.experience, entry.messages)
  );

  return { eligible, filtered, warnings };
}

function scrubField(value?: string | null): { value: string; placeholder: boolean } {
  if (!value || typeof value !== 'string') {
    return { value: '', placeholder: false };
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return { value: '', placeholder: false };
  }

  const normalized = trimmed.toLowerCase();

  if (normalized === 'present') {
    return { value: 'Present', placeholder: false };
  }

  if (PLACEHOLDER_EXACT_MATCHES.some((placeholder) => normalized === placeholder)) {
    return { value: '', placeholder: true };
  }

  if (PLACEHOLDER_REGEXPS.some((regex) => regex.test(trimmed))) {
    return { value: '', placeholder: true };
  }

  if (/\benter\s+/i.test(trimmed)) {
    return { value: '', placeholder: true };
  }

  return { value: trimmed, placeholder: false };
}

function buildWarning(experience: ResumeExperience, messages: string[]): string {
  const label = [experience.title, experience.company].filter(Boolean).join(' @ ') || 'Experience';
  return `${label} removed: ${messages.join(', ')}`;
}

function coerceBoolean(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
  }

  return undefined;
}

