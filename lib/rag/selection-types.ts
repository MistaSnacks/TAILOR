import type { ParsedJobDescription } from './job-types';

export type WriterBulletCandidate = {
  id: string;
  text: string;
  source_ids: string[];
  merged_from?: string[];
  score: number;
  has_metric: boolean;
  tool_matches: string[];
  similarity: number;
};

export type WriterExperience = {
  experience_id: string;
  title: string;
  company: string;
  location?: string;
  start?: string | null;
  end?: string | null;
  is_current?: boolean;
  bullet_budget: number;
  bullet_candidates: WriterBulletCandidate[];
};

export type WriterEducation = {
  institution: string;
  degree?: string;
  field?: string;
  startDate?: string;
  endDate?: string;
  graduationDate?: string;
};

export type WriterCertification = {
  name: string;
  issuer?: string;
  date?: string;
};

export type WriterContactInfo = {
  name?: string;
  email?: string;
  phone?: string;
  linkedin?: string;
  portfolio?: string;
  // Note: address is intentionally excluded - never include in resume
};

export type WriterInferenceContext = {
  experienceHighlights: string[];
  metricSignals: string[];
  instructions?: string;
};

export type TargetedProfilePayload = {
  experiences: WriterExperience[];
  topSkills: string[];
  parsedJD: ParsedJobDescription;
  education?: WriterEducation[];
  certifications?: WriterCertification[];
  contactInfo?: WriterContactInfo;
  canonicalSkillPool?: string[];
  inferenceContext?: WriterInferenceContext;
};



