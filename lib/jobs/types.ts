// Job Search Types - Normalized job schema for all providers

export type NormalizedJob = {
  id: string; // source:source_id (e.g., "linkedin:123456")
  source: JobSource;
  sourceId: string;
  title: string;
  company: string;
  companyLogo?: string;
  location: string;
  city?: string;
  state?: string;
  country?: string;
  isRemote: boolean;
  employmentType?: EmploymentType;
  seniority?: SeniorityLevel;
  postedAt: Date;
  description: string;
  descriptionHtml?: string;
  applyUrl: string;
  salary?: SalaryInfo;
  skills?: string[];
  benefits?: string[];
  // Dedup hash for detecting duplicate listings across sources
  dedupHash: string;
};

export type JobSource = 'linkedin' | 'jsearch' | 'adzuna' | 'remotive' | 'arbeitnow';

export type EmploymentType = 
  | 'full_time' 
  | 'part_time' 
  | 'contract' 
  | 'temporary' 
  | 'internship'
  | 'volunteer';

export type SeniorityLevel = 
  | 'entry' 
  | 'mid' 
  | 'senior' 
  | 'lead' 
  | 'manager' 
  | 'director' 
  | 'executive';

export type SalaryInfo = {
  min?: number;
  max?: number;
  currency: string;
  period: 'hourly' | 'monthly' | 'yearly';
};

export type JobSearchParams = {
  query: string;
  location?: string;
  remote?: boolean;
  employmentType?: EmploymentType;
  datePosted?: 'today' | 'week' | '2weeks' | 'month';
  page?: number;
  pageSize?: number;
};

export type JobSearchResult = {
  jobs: NormalizedJob[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  source: JobSource;
  cached: boolean;
  fetchedAt: Date;
};

// User job preferences for personalized feed
export type JobPreferences = {
  titles: string[];
  locations: string[];
  remotePreferred: boolean;
  remoteOnly?: boolean;
  skills: string[];
  seniority?: SeniorityLevel[];
  employmentTypes?: EmploymentType[];
  minSalary?: number;
  salaryPeriod?: 'hourly' | 'monthly' | 'yearly';
};

// Saved job for user
export type SavedJob = {
  id: string;
  userId: string;
  job: NormalizedJob;
  savedAt: Date;
  notes?: string;
  applied: boolean;
  appliedAt?: Date;
};

// Search history entry
export type SearchHistoryEntry = {
  id: string;
  userId: string;
  params: JobSearchParams;
  resultCount: number;
  searchedAt: Date;
};

// Saved search (alert)
export type SavedSearch = {
  id: string;
  userId: string;
  name: string;
  params: JobSearchParams;
  notifyEmail: boolean;
  createdAt: Date;
  lastRunAt?: Date;
};

