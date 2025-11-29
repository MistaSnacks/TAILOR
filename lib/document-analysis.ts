export type DocumentType = 'resume' | 'job_description' | 'template' | 'unknown';

type PlaceholderPattern = {
  label: string;
  source: string;
  flags?: string;
};

const PLACEHOLDER_PATTERNS: PlaceholderPattern[] = [
  { label: 'company_name', source: '\\bCompany Name\\b' },
  { label: 'your_company', source: '\\bYour Company\\b' },
  { label: 'job_title', source: '\\bJob Title\\b' },
  { label: 'position_title', source: '\\bPosition Title\\b' },
  { label: 'insert_title', source: '\\bInsert Title\\b' },
  { label: 'insert_company', source: '\\bInsert Company\\b' },
  { label: 'sample_company', source: '\\bSample Company\\b' },
  { label: 'sample_title', source: '\\bSample Title\\b' },
  { label: 'full_name', source: '\\bFull Name\\b' },
  { label: 'your_name', source: '\\bYour Name\\b' },
  { label: 'city_state', source: '\\bCity, State\\b' },
  { label: 'location', source: '\\bLocation\\b' },
  { label: 'address_line', source: '\\bAddress Line(?: 1| 2)?\\b' },
  { label: 'phone_placeholder', source: '\\b123-456-7890\\b' },
  { label: 'email_placeholder', source: '\\b(?:email@domain\\.com|email@example\\.com)\\b' },
  { label: 'date_literal', source: '\\b(?:YYYY|20XX|19XX)\\b' },
  { label: 'date_range', source: '\\bYYYY-MM\\b' },
  { label: 'insert_brackets', source: '\\[(?:Insert|Your|Candidate)[^\\]]*\\]' },
  { label: 'angle_brackets', source: '<[^>]+>' },
  { label: 'lorem_ipsum', source: '\\bLorem ipsum\\b' },
  { label: 'template_word', source: '\\bTemplate\\b' },
  { label: 'not_provided', source: '\\bNot Provided\\b' },
  { label: 'not_available', source: '\\bNot Available\\b' },
  { label: 'to_be_determined', source: '\\bTo Be Determined\\b' },
  { label: 'example_company', source: '\\bExample Company\\b' },
  { label: 'example_title', source: '\\bExample Title\\b' },
  { label: 'enter_patterns', source: '\\bEnter (?:Your|Company|Title|Name)\\b' },
  { label: 'fill_in', source: '\\bFill In\\b' },
];

const EXACT_PLACEHOLDERS = new Set(
  [
    'company name',
    'your company',
    'job title',
    'position title',
    'insert title',
    'insert company',
    'sample company',
    'sample title',
    'full name',
    'your name',
    'city, state',
    'location',
    'address line 1',
    'address line 2',
    'email address',
    'phone number',
    'insert summary here',
    'insert objective here',
    'yyyy-mm',
    'mm/yyyy',
    'month year',
    'yyyy',
    'yyyy-yyyy',
    '20xx',
    'not provided',
    'not available',
    'to be determined',
    'tbd',
    'n/a',
    'example company',
    'example title',
    'placeholder',
    'lorem ipsum',
  ].map(value => value.toLowerCase())
);

const RESUME_INDICATORS = [
  /\bsummary\b/gi,
  /\bexperience\b/gi,
  /\beducation\b/gi,
  /\bprojects?\b/gi,
  /\bskills?\b/gi,
  /\bcertifications?\b/gi,
  /\bprofessional\b/gi,
];

const JOB_DESCRIPTION_INDICATORS = [
  /\bresponsibilit(?:y|ies)\b/gi,
  /\bqualifications?\b/gi,
  /\brequirements?\b/gi,
  /\bwe are looking for\b/gi,
  /\bjob description\b/gi,
  /\babout the role\b/gi,
  /\bbenefits\b/gi,
];

const TEMPLATE_INDICATORS = [
  /\bplaceholder\b/gi,
  /\badd your\b/gi,
  /\bfill in\b/gi,
  /\btemplate\b/gi,
];

const PLACEHOLDER_MATCH_THRESHOLD = 5;
const PLACEHOLDER_DENSITY_THRESHOLD = 0.02;
const RESUME_SCORE_THRESHOLD = 3;
const JOB_DESCRIPTION_SCORE_THRESHOLD = 3;
const TEMPLATE_SCORE_THRESHOLD = 2;

export type PlaceholderAnalysis = {
  totalMatches: number;
  density: number;
  flagged: boolean;
  examples: string[];
  labels: Record<string, number>;
  wordCount: number;
  sanitizedWordCount: number;
};

export type DocumentAnalysis = {
  type: DocumentType;
  placeholder: PlaceholderAnalysis;
  scores: {
    resume: number;
    job_description: number;
    template: number;
  };
  structured?: any;
};

export type DocumentInspectionResult = {
  sanitizedText: string;
  analysis: DocumentAnalysis;
};

export function inspectDocumentText(rawText: string): DocumentInspectionResult {
  const { sanitizedText, placeholder } = stripPlaceholders(rawText);
  const scores = scoreDocumentType(rawText, placeholder);
  const type = determineDocumentType(scores, placeholder);

  return {
    sanitizedText,
    analysis: {
      type,
      placeholder,
      scores,
    },
  };
}

export function sanitizeField(value?: string | null): string | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  const lower = normalized.toLowerCase();
  if (EXACT_PLACEHOLDERS.has(lower)) {
    return null;
  }

  for (const pattern of PLACEHOLDER_PATTERNS) {
    const regex = new RegExp(pattern.source, pattern.flags ?? 'gi');
    if (regex.test(normalized)) {
      return null;
    }
  }

  return normalized;
}

export function sanitizeTextBlock(value?: string | null): string | null {
  if (!value) {
    return null;
  }

  const { sanitizedText } = stripPlaceholders(value);
  const normalized = sanitizedText.trim();
  return normalized.length > 0 ? normalized : null;
}

export function stripPlaceholders(rawText: string) {
  let sanitizedText = rawText;
  let totalMatches = 0;
  const labels: Record<string, number> = {};
  const examples: string[] = [];

  for (const pattern of PLACEHOLDER_PATTERNS) {
    const regex = new RegExp(pattern.source, pattern.flags ?? 'gi');
    const matches = [...rawText.matchAll(regex)];

    if (matches.length === 0) {
      continue;
    }

    totalMatches += matches.length;
    labels[pattern.label] = (labels[pattern.label] ?? 0) + matches.length;

    matches.slice(0, 2).forEach(match => {
      if (examples.length < 5 && match[0]) {
        examples.push(match[0].slice(0, 80));
      }
    });

    sanitizedText = sanitizedText.replace(regex, ' ');
  }

  sanitizedText = sanitizedText.replace(/\s{2,}/g, ' ').trim();

  const wordCount = rawText.split(/\s+/).filter(Boolean).length || 1;
  const sanitizedWordCount = sanitizedText.split(/\s+/).filter(Boolean).length;
  const density = totalMatches / wordCount;
  const flagged = totalMatches >= PLACEHOLDER_MATCH_THRESHOLD || density >= PLACEHOLDER_DENSITY_THRESHOLD;

  return {
    sanitizedText,
    placeholder: {
      totalMatches,
      density,
      flagged,
      examples,
      labels,
      wordCount,
      sanitizedWordCount,
    },
  };
}

function scoreDocumentType(rawText: string, placeholder: PlaceholderAnalysis) {
  const resumeScore = scoreByIndicators(rawText, RESUME_INDICATORS);
  const jobDescriptionScore = scoreByIndicators(rawText, JOB_DESCRIPTION_INDICATORS);
  const templateScore = scoreByIndicators(rawText, TEMPLATE_INDICATORS) + (placeholder.flagged ? 2 : 0);

  return {
    resume: resumeScore,
    job_description: jobDescriptionScore,
    template: templateScore,
  };
}

function determineDocumentType(
  scores: { resume: number; job_description: number; template: number },
  placeholder: PlaceholderAnalysis
): DocumentType {
  if (placeholder.flagged && placeholder.totalMatches >= PLACEHOLDER_MATCH_THRESHOLD) {
    return 'template';
  }

  if (scores.template >= TEMPLATE_SCORE_THRESHOLD) {
    return 'template';
  }

  if (scores.resume >= RESUME_SCORE_THRESHOLD && scores.resume >= scores.job_description) {
    return 'resume';
  }

  if (scores.job_description >= JOB_DESCRIPTION_SCORE_THRESHOLD && scores.job_description > scores.resume) {
    return 'job_description';
  }

  return 'unknown';
}

function scoreByIndicators(text: string, indicators: RegExp[]) {
  return indicators.reduce((score, regex) => {
    const matches = text.match(regex);
    return score + (matches ? matches.length : 0);
  }, 0);
}

