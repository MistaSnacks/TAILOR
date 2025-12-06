// JSearch (RapidAPI) Provider
// Preferred compliant source for job search

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

const JSEARCH_ENABLED = process.env.JSEARCH_ENABLED === 'true';
const JSEARCH_API_KEY = process.env.JSEARCH_API_KEY || '';
const JSEARCH_HOST = process.env.JSEARCH_HOST || 'jsearch.p.rapidapi.com';

// 🔑 Environment sanity log (REMOVE IN PRODUCTION)
console.log('🌐 JSearch env check (NO $):', {
  enabled: JSEARCH_ENABLED ? '✅' : '❌',
  host: JSEARCH_HOST,
  apiKeyPresent: JSEARCH_API_KEY ? '✅' : '❌',
});

// Map employment types to normalized types
function mapEmploymentType(type?: string): EmploymentType | undefined {
  if (!type) return undefined;
  const t = type.toLowerCase();
  if (t.includes('full')) return 'full_time';
  if (t.includes('part')) return 'part_time';
  if (t.includes('contract')) return 'contract';
  if (t.includes('temp')) return 'temporary';
  if (t.includes('intern')) return 'internship';
  return undefined;
}

// Map seniority heuristically from title
function inferSeniority(title: string): SeniorityLevel | undefined {
  const t = title.toLowerCase();
  if (t.includes('director')) return 'director';
  if (t.includes('vp') || t.includes('vice president')) return 'executive';
  if (t.includes('chief') || t.includes('cxo') || t.includes('cfo') || t.includes('cto') || t.includes('ceo')) return 'executive';
  if (t.includes('manager') || t.includes('lead')) return 'manager';
  if (t.includes('senior') || t.includes('sr')) return 'senior';
  if (t.includes('junior') || t.includes('jr')) return 'entry';
  return undefined;
}

function normalizeJSearchJob(job: any, forceRemote = false): NormalizedJob | null {
  try {
    const postedAt =
      parseJobDate(job.job_posted_at_datetime_utc) ||
      parseJobDate(job.job_posted_at_timestamp) ||
      parseJobDate(job.job_posted_at);

    if (!isJobFresh(postedAt, 14)) return null;

    const sourceId = String(job.job_id || job.jobId || job.id || '');
    if (!sourceId) return null;

    const title = job.job_title || job.title || 'Untitled Position';
    const company = job.employer_name || 'Unknown Company';
    const location =
      job.job_city && job.job_state
        ? `${job.job_city}, ${job.job_state}`
        : job.job_location || job.job_city || job.job_state || job.job_country || 'Location not specified';

    const applyUrl = job.job_apply_link || job.job_apply_url || job.job_apply_options?.[0]?.apply_link || '';

    // If we requested remote_jobs_only=true, trust that the API filtered correctly
    // JSearch API returns job_is_remote: false even for remote-filtered results
    const rawIsRemote = job.job_is_remote;
    const locationHasRemote = (location || '').toLowerCase().includes('remote');
    const isRemote = forceRemote || rawIsRemote === true || rawIsRemote === 'true' || locationHasRemote;

    const normalized: NormalizedJob = {
      id: `jsearch:${sourceId}`,
      source: 'jsearch',
      sourceId,
      title,
      company,
      companyLogo: job.employer_logo || undefined,
      location,
      city: job.job_city || undefined,
      state: job.job_state || undefined,
      country: job.job_country || undefined,
      isRemote,
      employmentType: mapEmploymentType(job.job_employment_type),
      seniority: inferSeniority(title),
      postedAt,
      description: job.job_description || '',
      applyUrl,
      salary: undefined, // JSearch often does not provide structured salary
      skills: job.job_required_skills || job.job_highlights?.Qualifications || [],
      benefits: job.job_benefits || [],
      dedupHash: generateDedupHash({ title, company, location, applyUrl }),
    };

    return normalized;
  } catch (error) {
    console.error('❌ Error normalizing JSearch job:', (error as Error).message);
    return null;
  }
}

export const jsearchProvider: JobProvider = {
  name: 'jsearch',
  enabled: JSEARCH_ENABLED && !!JSEARCH_API_KEY,

  async search(params: JobSearchParams): Promise<JobSearchResult> {
    const providerName = 'jsearch';
    const startTime = Date.now();

    console.log('🔍 (IS $) JSearch API search:', {
      query: params.query,
      location: params.location,
      enabled: this.enabled,
      circuitStatus: getCircuitStatus(providerName),
    });

    if (!this.enabled) {
      console.log('⚠️ (NO $) JSearch API is disabled');
      return {
        jobs: [],
        totalCount: 0,
        page: params.page || 1,
        pageSize: params.pageSize || 10,
        hasMore: false,
        source: 'jsearch',
        cached: false,
        fetchedAt: new Date(),
      };
    }

    const guardCheck = canMakeRequest(providerName);
    if (!guardCheck.allowed) {
      console.warn(`⚠️ (NO $) JSearch API blocked: ${guardCheck.reason}`);
      return {
        jobs: [],
        totalCount: 0,
        page: params.page || 1,
        pageSize: params.pageSize || 10,
        hasMore: false,
        source: 'jsearch',
        cached: false,
        fetchedAt: new Date(),
      };
    }

    try {
      const page = params.page || 1;
      const pageSize = Math.min(params.pageSize || 10, 20);

      const queryParams = new URLSearchParams({
        query: params.query,
        page: String(page),
        num_pages: '1',
        ...(params.location ? { location: params.location } : {}),
        ...(params.remote ? { remote_jobs_only: 'true' } : {}),
      });

      // JSearch date filter options: "all", "today", "3days", "week", "month"
      const dateMap: Record<string, string> = {
        today: 'today',
        week: 'week',
        '2weeks': 'week', // will re-filter client side
        month: 'month',
      };
      const datePosted = params.datePosted ? dateMap[params.datePosted] || 'week' : 'week';
      queryParams.set('date_posted', datePosted);

      const url = `https://${JSEARCH_HOST}/search?${queryParams.toString()}`;

      console.log('🌐 (IS $) Fetching from JSearch...', { url, page, pageSize });
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-RapidAPI-Key': JSEARCH_API_KEY,
          'X-RapidAPI-Host': JSEARCH_HOST,
        },
      });

      const duration = Date.now() - startTime;
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ (IS $) JSearch error:', response.status, errorText);
        throw new Error(`JSearch API error: ${response.status}`);
      }

      const data = await response.json();
      const rawJobs = data.data || data.jobs || [];
      const totalCount = data.total_jobs || data.total || rawJobs.length || 0;

      // If we requested remote_jobs_only=true, force isRemote flag since JSearch
      // returns job_is_remote: false even for remote-filtered results
      const forceRemote = params.remote === true;
      
      const jobs: NormalizedJob[] = [];
      for (const raw of rawJobs) {
        const normalized = normalizeJSearchJob(raw, forceRemote);
        if (normalized) {
          jobs.push(normalized);
        }
      }

      // If user requested 2weeks, enforce client-side 14-day filter
      const filteredJobs =
        params.datePosted === '2weeks'
          ? jobs.filter(j => isJobFresh(j.postedAt, 14))
          : jobs;

      recordSuccess(providerName);
      incrementQuota(providerName);
      logRequest({
        provider: providerName,
        timestamp: new Date(),
        durationMs: duration,
        success: true,
        resultCount: filteredJobs.length,
        cached: false,
      });

      console.log(`✅ (IS $) JSearch: ${filteredJobs.length} fresh jobs (from ${rawJobs.length} raw)`);

      return {
        jobs: filteredJobs,
        totalCount,
        page,
        pageSize,
        hasMore: page * pageSize < totalCount,
        source: 'jsearch',
        cached: false,
        fetchedAt: new Date(),
      };
    } catch (error: any) {
      recordFailure(providerName);
      logRequest({
        provider: providerName,
        timestamp: new Date(),
        durationMs: Date.now() - startTime,
        success: false,
        error: error.message,
        cached: false,
      });

      console.error('❌ (IS $) JSearch search error:', error?.message || error);
      return {
        jobs: [],
        totalCount: 0,
        page: params.page || 1,
        pageSize: params.pageSize || 10,
        hasMore: false,
        source: 'jsearch',
        cached: false,
        fetchedAt: new Date(),
      };
    }
  },
};

export default jsearchProvider;

