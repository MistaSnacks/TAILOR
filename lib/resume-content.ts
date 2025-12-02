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
  field?: string;
  startDate?: string;
  endDate?: string;
  year?: string; // Legacy fallback for graduation date
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
  linkedin?: string;
  portfolio?: string;
  location?: string;
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
  contact: {
    name: '',
    email: '',
    phone: '',
    linkedin: '',
    portfolio: '',
  },
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
            school: edu.school || edu.institution || '', // Support both field names
            field: edu.field || edu.fieldOfStudy || '',
            // Support start/end dates or graduation date
            startDate: edu.startDate || '',
            endDate: edu.endDate || '',
            year: edu.year || edu.graduationDate || edu.endDate || '', // Fallback for legacy
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
        // Support both contactInfo (from generator) and contact (legacy)
        contact: {
          name: content.contactInfo?.name || content.contact?.name || '',
          email: content.contactInfo?.email || content.contact?.email || '',
          phone: content.contactInfo?.phone || content.contact?.phone || '',
          linkedin: content.contactInfo?.linkedin || content.contact?.linkedin || '',
          portfolio: content.contactInfo?.portfolio || content.contact?.portfolio || '',
          location: content.contactInfo?.location || content.contact?.location || '',
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
  // Note: 'location' removed - it's a legitimate field name/value
  'mm/yyyy',
  'month year',
  'yyyy',
  'yyyy-yyyy',
  '20xx',
  'tbd',
  'n/a',
  'not provided',
  'not available',
  'to be determined',
  'example company',
  'example title',
  'your name',
  // Note: 'full name', 'email address', 'phone number', 'address line' removed - too aggressive
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
  /insert\s+(company|title|role|your|name)/i,
  /sample\s+(company|title|text)/i,
  /city,\s*state/i,
  /mm\/yyyy/i,
  /month\s+year/i,
  /\b20xx\b/i,
  /\byyyy\b/i,
  /\btbd\b/i,
  /\bn\/a\b/i,
  /\bnot\s+provided\b/i,
  /\bnot\s+available\b/i,
  /\bto\s+be\s+determined\b/i,
  /\bexample\s+(company|title|name)\b/i,
  /\byour\s+(company|title|name|email|phone)\b/i,
  // Removed overly aggressive patterns that could match legitimate content:
  // /\bfull\s+name\b/i, - could match "Full Name: John Doe"
  // /\bemail\s+address\b/i, - could match legitimate text
  // /\bphone\s+number\b/i, - could match legitimate text
  // /\baddress\s+line\b/i, - could match legitimate text
  /\benter\s+(your|company|title|name)\b/i,
  /\bfill\s+in\b/i,
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
    ? (candidate.bullets as any[]).map((bullet) => {
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
      return { ...scrubField(''), sourceIds: [] };
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

/**
 * Post-process resume content to remove any remaining ghost/placeholder data
 * This is a final safety check after generation
 */
/**
 * Format resume content as a readable string for ATS scoring
 * Excludes metadata like critic and validator data
 */
export function formatResumeForAts(content: ResumeContent): string {
  const parts: string[] = [];

  // Contact info
  if (content.contact) {
    const contactParts: string[] = [];
    if (content.contact.name) contactParts.push(`Name: ${content.contact.name}`);
    if (content.contact.email) contactParts.push(`Email: ${content.contact.email}`);
    if (content.contact.phone) contactParts.push(`Phone: ${content.contact.phone}`);
    if (content.contact.linkedin) contactParts.push(`LinkedIn: ${content.contact.linkedin}`);
    if (content.contact.portfolio) contactParts.push(`Portfolio: ${content.contact.portfolio}`);
    if (contactParts.length > 0) {
      parts.push('CONTACT INFORMATION');
      parts.push(contactParts.join('\n'));
      parts.push('');
    }
  }

  // Summary
  if (content.summary) {
    parts.push('PROFESSIONAL SUMMARY');
    parts.push(content.summary);
    parts.push('');
  }

  // Skills
  if (content.skills && content.skills.length > 0) {
    parts.push('SKILLS');
    parts.push(content.skills.join(', '));
    parts.push('');
  }

  // Experience
  if (content.experience && content.experience.length > 0) {
    parts.push('PROFESSIONAL EXPERIENCE');
    content.experience.forEach((exp) => {
      const expParts: string[] = [];
      expParts.push(`${exp.title} at ${exp.company}`);
      if (exp.location) expParts.push(`Location: ${exp.location}`);
      if (exp.startDate || exp.endDate) {
        const dateRange = `${exp.startDate || ''} - ${exp.endDate || 'Present'}`;
        expParts.push(`Dates: ${dateRange}`);
      }
      if (exp.bullets && exp.bullets.length > 0) {
        exp.bullets.forEach((bullet) => {
          // Handle both string and object formats
          const bulletText = typeof bullet === 'string'
            ? bullet
            : (bullet && typeof bullet === 'object' && 'text' in (bullet as any) && typeof (bullet as any).text === 'string')
              ? (bullet as any).text
              : '';
          if (bulletText) {
            expParts.push(`• ${bulletText}`);
          }
        });
      }
      parts.push(expParts.join('\n'));
      parts.push('');
    });
  }

  // Education
  if (content.education && content.education.length > 0) {
    parts.push('EDUCATION');
    content.education.forEach((edu) => {
      const eduParts: string[] = [];
      if (edu.degree) eduParts.push(edu.degree);
      if (edu.field) eduParts.push(`in ${edu.field}`);
      if (edu.school) eduParts.push(`from ${edu.school}`);
      if (edu.startDate || edu.endDate || edu.year) {
        const date = edu.endDate || edu.year || '';
        if (date) eduParts.push(`(${date})`);
      }
      parts.push(eduParts.join(' '));
    });
    parts.push('');
  }

  // Certifications
  if (content.certifications && content.certifications.length > 0) {
    parts.push('CERTIFICATIONS');
    content.certifications.forEach((cert) => {
      const certParts: string[] = [];
      certParts.push(cert.name);
      if (cert.issuer) certParts.push(`from ${cert.issuer}`);
      if (cert.date) certParts.push(`(${cert.date})`);
      parts.push(certParts.join(' '));
    });
    parts.push('');
  }

  return parts.join('\n');
}

export function removeGhostData(content: ResumeContent): ResumeContent {
  if (!content) return content;

  const cleaned: ResumeContent = { ...content };

  // Filter out experiences with placeholder data
  if (cleaned.experience && Array.isArray(cleaned.experience)) {
    cleaned.experience = cleaned.experience
      .map((exp) => {
        // Check each field for placeholders
        const title = scrubField(exp.title);
        const company = scrubField(exp.company);
        const location = exp.location ? scrubField(exp.location) : { value: '', placeholder: false };
        const startDate = exp.startDate ? scrubField(exp.startDate) : { value: '', placeholder: false };
        const endDate = exp.endDate ? scrubField(exp.endDate) : { value: '', placeholder: false };

        // If title or company is placeholder, skip this experience
        if (title.placeholder || company.placeholder) {
          return null;
        }

        // Clean bullets - handle both string and object formats
        const cleanedBullets = (exp.bullets || [])
          .map((bullet) => {
            // Handle object format with text property (from generator)
            let bulletText: string;
            if (typeof bullet === 'string') {
              bulletText = bullet;
            } else if (bullet && typeof bullet === 'object' && 'text' in bullet && typeof bullet.text === 'string') {
              bulletText = bullet.text;
            } else {
              return null;
            }
            
            const cleaned = scrubField(bulletText);
            return cleaned.placeholder ? null : cleaned.value;
          })
          .filter((bullet): bullet is string => Boolean(bullet));

        return {
          ...exp,
          title: title.value,
          company: company.value,
          location: location.placeholder ? undefined : location.value || undefined,
          startDate: startDate.placeholder ? undefined : startDate.value || undefined,
          endDate: endDate.placeholder ? undefined : endDate.value || undefined,
          bullets: cleanedBullets,
        };
      })
      .filter((exp) => exp !== null && Boolean(exp.title && exp.company)) as ResumeExperience[];
  }

  // Filter out skills with placeholder data
  if (cleaned.skills && Array.isArray(cleaned.skills)) {
    cleaned.skills = cleaned.skills
      .map((skill) => {
        const cleaned = scrubField(skill);
        return cleaned.placeholder ? null : cleaned.value;
      })
      .filter((skill) => Boolean(skill) && skill!.length > 0) as string[];
  }

  // Filter out education with placeholder data
  if (cleaned.education && Array.isArray(cleaned.education)) {
    cleaned.education = cleaned.education
      .map((edu) => {
        const school = scrubField(edu.school);
        const degree = scrubField(edu.degree);

        if (school.placeholder || degree.placeholder) {
          return null;
        }

        const field = edu.field ? scrubField(edu.field) : { value: '', placeholder: false };
        const startDate = edu.startDate ? scrubField(edu.startDate) : { value: '', placeholder: false };
        const endDate = edu.endDate ? scrubField(edu.endDate) : { value: '', placeholder: false };

        return {
          ...edu,
          school: school.value,
          degree: degree.value,
          field: field.placeholder ? undefined : field.value || undefined,
          startDate: startDate.placeholder ? undefined : startDate.value || undefined,
          endDate: endDate.placeholder ? undefined : endDate.value || undefined,
        };
      })
      .filter((edu) => edu !== null && Boolean(edu.school && edu.degree)) as ResumeEducation[];
  }

  // Filter out certifications with placeholder data
  if (cleaned.certifications && Array.isArray(cleaned.certifications)) {
    cleaned.certifications = cleaned.certifications
      .map((cert) => {
        const name = scrubField(cert.name);
        if (name.placeholder) {
          return null;
        }

        const issuer = cert.issuer ? scrubField(cert.issuer) : { value: '', placeholder: false };
        const date = cert.date ? scrubField(cert.date) : { value: '', placeholder: false };

        return {
          ...cert,
          name: name.value,
          issuer: issuer.placeholder ? undefined : issuer.value || undefined,
          date: date.placeholder ? undefined : date.value || undefined,
        };
      })
      .filter((cert) => cert !== null && Boolean(cert.name)) as ResumeCertification[];
  }

  // Clean contact info
  if (cleaned.contact) {
    const name = cleaned.contact.name ? scrubField(cleaned.contact.name) : { value: '', placeholder: false };
    const email = cleaned.contact.email ? scrubField(cleaned.contact.email) : { value: '', placeholder: false };
    const phone = cleaned.contact.phone ? scrubField(cleaned.contact.phone) : { value: '', placeholder: false };
    const linkedin = cleaned.contact.linkedin ? scrubField(cleaned.contact.linkedin) : { value: '', placeholder: false };
    const portfolio = cleaned.contact.portfolio ? scrubField(cleaned.contact.portfolio) : { value: '', placeholder: false };

    cleaned.contact = {
      name: name.placeholder ? undefined : name.value || undefined,
      email: email.placeholder ? undefined : email.value || undefined,
      phone: phone.placeholder ? undefined : phone.value || undefined,
      linkedin: linkedin.placeholder ? undefined : linkedin.value || undefined,
      portfolio: portfolio.placeholder ? undefined : portfolio.value || undefined,
    };
  }

  // Clean summary
  if (cleaned.summary) {
    const summary = scrubField(cleaned.summary);
    cleaned.summary = summary.placeholder ? undefined : summary.value || undefined;
  }

  return cleaned;
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

