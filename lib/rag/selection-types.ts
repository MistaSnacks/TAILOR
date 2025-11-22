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

export type TargetedProfilePayload = {
  experiences: WriterExperience[];
  topSkills: string[];
  parsedJD: ParsedJobDescription;
};



