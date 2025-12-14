// LinkedIn RapidAPI Provider (DEV ONLY - behind feature flag)
// ⚠️ This is an unofficial API and should NOT be used in production
// TOS compliance concerns - use only for development/testing

import type { JobSearchParams, JobSearchResult, NormalizedJob, EmploymentType, SeniorityLevel } from '../types';
import type { JobProvider } from '../provider-base';
import { generateDedupHash, parseJobDate, isJobFresh } from '../provider-base';
import { 
  canMakeRequest, 
  recordSuccess, 
  recordFailure, 
  incrementQuota,
  logRequest,
  getCircuitStatus,
} from '../observability';

// Feature flag - MUST be false in production
const LINKEDIN_RAPID_ENABLED = process.env.LINKEDIN_RAPID_ENABLED === 'true';
const LINKEDIN_RAPID_API_KEY = process.env.LINKEDIN_RAPID_API_KEY || '';
const LINKEDIN_RAPID_HOST = process.env.LINKEDIN_RAPID_HOST || 'linkedin-job-search-api.p.rapidapi.com';

// Rate limiting
const MAX_REQUESTS_PER_MINUTE = 30;
const requestTimestamps: number[] = [];

function checkRateLimit(): boolean {
  const now = Date.now();
  const oneMinuteAgo = now - 60000;
  
  // Remove old timestamps
  while (requestTimestamps.length > 0 && requestTimestamps[0] < oneMinuteAgo) {
    requestTimestamps.shift();
  }
  
  if (requestTimestamps.length >= MAX_REQUESTS_PER_MINUTE) {
    console.warn('⚠️ LinkedIn Rapid API rate limit reached');
    return false;
  }
  
  requestTimestamps.push(now);
  return true;
}

// Map LinkedIn employment types to our normalized types
function mapEmploymentType(linkedInType?: string): EmploymentType | undefined {
  if (!linkedInType) return undefined;
  
  const mapping: Record<string, EmploymentType> = {
    'full-time': 'full_time',
    'fulltime': 'full_time',
    'full_time': 'full_time',
    'part-time': 'part_time',
    'parttime': 'part_time',
    'part_time': 'part_time',
    'contract': 'contract',
    'contractor': 'contract',
    'temporary': 'temporary',
    'temp': 'temporary',
    'internship': 'internship',
    'intern': 'internship',
    'volunteer': 'volunteer',
  };
  
  return mapping[linkedInType.toLowerCase()] || undefined;
}

// Map seniority levels
function mapSeniority(linkedInLevel?: string): SeniorityLevel | undefined {
  if (!linkedInLevel) return undefined;
  
  const mapping: Record<string, SeniorityLevel> = {
    'entry': 'entry',
    'entry-level': 'entry',
    'entry_level': 'entry',
    'associate': 'entry',
    'mid': 'mid',
    'mid-level': 'mid',
    'mid_level': 'mid',
    'senior': 'senior',
    'senior-level': 'senior',
    'lead': 'lead',
    'manager': 'manager',
    'director': 'director',
    'executive': 'executive',
    'vp': 'executive',
    'c-level': 'executive',
  };
  
  return mapping[linkedInLevel.toLowerCase()] || undefined;
}

// Convert date_posted param to LinkedIn API format
function mapDatePosted(datePosted?: string): string | undefined {
  if (!datePosted) return undefined;
  
  const mapping: Record<string, string> = {
    'today': 'past24Hours',
    'week': 'pastWeek',
    '2weeks': 'pastMonth', // LinkedIn doesn't have 2 weeks, use month and filter client-side
    'month': 'pastMonth',
  };
  
  return mapping[datePosted] || undefined;
}

// Normalize LinkedIn job response to our standard format
function normalizeLinkedInJob(job: any): NormalizedJob | null {
  try {
    const postedAt = parseJobDate(job.postedAt || job.posted_at || job.publishedAt);
    
    // Skip jobs older than 14 days
    if (!isJobFresh(postedAt, 14)) {
      return null;
    }
    
    const sourceId = String(job.id || job.jobId || job.job_id || '');
    if (!sourceId) {
      console.warn('⚠️ LinkedIn job missing ID, skipping');
      return null;
    }
    
    const title = job.title || job.jobTitle || 'Untitled Position';
    const company = job.company?.name || job.companyName || job.company || 'Unknown Company';
    const location = job.location || job.jobLocation || 'Location not specified';
    const applyUrl = job.applyUrl || job.apply_url || job.url || job.link || '';
    
    const normalized: NormalizedJob = {
      id: `linkedin:${sourceId}`,
      source: 'linkedin',
      sourceId,
      title,
      company,
      companyLogo: job.company?.logo || job.companyLogo || undefined,
      location,
      city: job.city || undefined,
      state: job.state || undefined,
      country: job.country || 'US',
      isRemote: Boolean(
        job.remote || 
        job.isRemote || 
        location.toLowerCase().includes('remote')
      ),
      employmentType: mapEmploymentType(job.employmentType || job.employment_type),
      seniority: mapSeniority(job.seniority || job.experienceLevel),
      postedAt,
      description: job.description || job.jobDescription || '',
      descriptionHtml: job.descriptionHtml || undefined,
      applyUrl,
      salary: job.salary ? {
        min: job.salary.min || job.salary.minimum,
        max: job.salary.max || job.salary.maximum,
        currency: job.salary.currency || 'USD',
        period: job.salary.period || 'yearly',
      } : undefined,
      skills: job.skills || job.requiredSkills || [],
      benefits: job.benefits || [],
      dedupHash: generateDedupHash({ title, company, location, applyUrl }),
    };
    
    return normalized;
  } catch (error) {
    console.error('❌ Error normalizing LinkedIn job:', error);
    return null;
  }
}

export const linkedInRapidProvider: JobProvider = {
  name: 'linkedin-rapid',
  enabled: LINKEDIN_RAPID_ENABLED && !!LINKEDIN_RAPID_API_KEY,
  
  async search(params: JobSearchParams): Promise<JobSearchResult> {
    const providerName = 'linkedin-rapid';
    const startTime = Date.now();
    
    console.log('🔍 (IS $) LinkedIn Rapid API search:', { 
      query: params.query, 
      location: params.location,
      enabled: this.enabled,
      circuitStatus: getCircuitStatus(providerName),
    });
    
    // Guard: Feature flag check
    if (!this.enabled) {
      console.log('⚠️ (NO $) LinkedIn Rapid API is disabled');
      return {
        jobs: [],
        totalCount: 0,
        page: params.page || 1,
        pageSize: params.pageSize || 10,
        hasMore: false,
        source: 'linkedin',
        cached: false,
        fetchedAt: new Date(),
      };
    }
    
    // Guard: Combined check (production, circuit breaker, quota)
    const guardCheck = canMakeRequest(providerName);
    if (!guardCheck.allowed) {
      console.warn(`⚠️ (NO $) LinkedIn Rapid API blocked: ${guardCheck.reason}`);
      return {
        jobs: [],
        totalCount: 0,
        page: params.page || 1,
        pageSize: params.pageSize || 10,
        hasMore: false,
        source: 'linkedin',
        cached: false,
        fetchedAt: new Date(),
      };
    }
    
    // Guard: Rate limit check (local)
    if (!checkRateLimit()) {
      console.warn('⚠️ (NO $) LinkedIn Rapid API rate limited');
      return {
        jobs: [],
        totalCount: 0,
        page: params.page || 1,
        pageSize: params.pageSize || 10,
        hasMore: false,
        source: 'linkedin',
        cached: false,
        fetchedAt: new Date(),
      };
    }
    
    try {
      const page = params.page || 1;
      const pageSize = Math.min(params.pageSize || 10, 25); // Max 25 per request
      
      // Build query params
      const queryParams = new URLSearchParams({
        keywords: params.query,
        locationId: params.location || '',
        datePosted: mapDatePosted(params.datePosted) || 'pastWeek',
        sort: 'mostRecent',
        start: String((page - 1) * pageSize),
      });
      
      if (params.remote) {
        queryParams.set('remote', 'true');
      }
      
      if (params.employmentType) {
        queryParams.set('employmentType', params.employmentType);
      }
      
      const url = `https://${LINKEDIN_RAPID_HOST}/search?${queryParams.toString()}`;
      
      console.log('🌐 (IS $) Fetching from LinkedIn Rapid API...');
      const startTime = Date.now();
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-RapidAPI-Key': LINKEDIN_RAPID_API_KEY,
          'X-RapidAPI-Host': LINKEDIN_RAPID_HOST,
        },
      });
      
      const fetchTime = Date.now() - startTime;
      console.log(`📊 (IS $) LinkedIn Rapid API response: ${response.status} in ${fetchTime}ms`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ (IS $) LinkedIn Rapid API error:', response.status, errorText);
        throw new Error(`LinkedIn API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Handle various response formats
      const rawJobs = data.data || data.jobs || data.results || data || [];
      const totalCount = data.total || data.totalCount || data.count || rawJobs.length;
      
      // Normalize and filter jobs
      const jobs: NormalizedJob[] = [];
      for (const rawJob of rawJobs) {
        const normalized = normalizeLinkedInJob(rawJob);
        if (normalized) {
          jobs.push(normalized);
        }
      }
      
      // Additional freshness filter for 2-week window
      const freshJobs = params.datePosted === '2weeks' 
        ? jobs.filter(j => isJobFresh(j.postedAt, 14))
        : jobs;
      
      console.log(`✅ (IS $) LinkedIn Rapid API: ${freshJobs.length} fresh jobs (filtered from ${rawJobs.length} raw)`);
      
      // Record success for circuit breaker and quota
      recordSuccess(providerName);
      incrementQuota(providerName);
      logRequest({
        provider: providerName,
        timestamp: new Date(),
        durationMs: Date.now() - startTime,
        success: true,
        resultCount: freshJobs.length,
        cached: false,
      });
      
      return {
        jobs: freshJobs,
        totalCount,
        page,
        pageSize,
        hasMore: page * pageSize < totalCount,
        source: 'linkedin',
        cached: false,
        fetchedAt: new Date(),
      };
    } catch (error: any) {
      console.error('❌ (IS $) LinkedIn Rapid API search error:', error.message);
      
      // Record failure for circuit breaker
      recordFailure(providerName);
      logRequest({
        provider: providerName,
        timestamp: new Date(),
        durationMs: Date.now() - startTime,
        success: false,
        error: error.message,
        cached: false,
      });
      
      // Return empty result on error (fail gracefully)
      return {
        jobs: [],
        totalCount: 0,
        page: params.page || 1,
        pageSize: params.pageSize || 10,
        hasMore: false,
        source: 'linkedin',
        cached: false,
        fetchedAt: new Date(),
      };
    }
  },
};

export default linkedInRapidProvider;

