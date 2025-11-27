export type JobSeniorityLevel =
  | 'IC'
  | 'Senior IC'
  | 'Manager'
  | 'Director'
  | 'VP'
  | 'Executive';

export type ParsedJobDescription = {
  normalizedTitle: string;
  level: JobSeniorityLevel;
  domain: string;
  responsibilities: string[];
  hardSkills: string[];
  softSkills: string[];
  queries: string[];
  keyPhrases: string[]; // Multi-word phrases important for ATS matching
};

export const DEFAULT_PARSED_JOB_DESCRIPTION: ParsedJobDescription = {
  normalizedTitle: '',
  level: 'IC',
  domain: 'general',
  responsibilities: [],
  hardSkills: [],
  softSkills: [],
  queries: [],
  keyPhrases: [],
};

export function ensureParsedJobDescription(
  partial?: Partial<ParsedJobDescription>
): ParsedJobDescription {
  return {
    normalizedTitle: partial?.normalizedTitle?.trim() || '',
    level: partial?.level || 'IC',
    domain: partial?.domain?.trim() || 'general',
    responsibilities: Array.isArray(partial?.responsibilities)
      ? partial!.responsibilities!.map((item) => String(item).trim()).filter(Boolean)
      : [],
    hardSkills: Array.isArray(partial?.hardSkills)
      ? partial!.hardSkills!.map((item) => String(item).trim()).filter(Boolean)
      : [],
    softSkills: Array.isArray(partial?.softSkills)
      ? partial!.softSkills!.map((item) => String(item).trim()).filter(Boolean)
      : [],
    queries: Array.isArray(partial?.queries)
      ? partial!.queries!.map((item) => String(item).trim()).filter(Boolean)
      : [],
    keyPhrases: Array.isArray(partial?.keyPhrases)
      ? partial!.keyPhrases!.map((item) => String(item).trim()).filter(Boolean)
      : [],
  };
}



