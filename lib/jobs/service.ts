// Job Search Service
// Orchestrates providers, caching, deduplication, and ranking

import type { 
  JobSearchParams, 
  JobSearchResult, 
  NormalizedJob, 
  JobPreferences,
  SavedJob,
  SearchHistoryEntry,
  SavedSearch,
} from './types';
import { getEnabledProviders, hasEnabledProviders } from './providers';
import { 
  getCachedResult, 
  setCachedResult, 
  deduplicateJobs, 
  filterFreshJobs,
  sortJobsByRelevance,
} from './cache';
import { supabaseAdmin } from '../supabase';

// Simple in-memory cache for personalized feed per user (24h TTL)
const FEED_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const feedCache = new Map<string, { jobs: NormalizedJob[]; fetchedAt: number }>();

// ────────────────────────────────────────────────────────────────────────────
// Job Search
// ────────────────────────────────────────────────────────────────────────────

export async function searchJobs(
  params: JobSearchParams,
  preferences?: JobPreferences
): Promise<JobSearchResult> {
  console.log('🔍 (NO $) Job search service:', { 
    query: params.query, 
    location: params.location,
    preferences: !!preferences,
  });
  
  const providers = getEnabledProviders();
  console.log('🛰️ (NO $) Enabled job providers:', providers.map(p => p.name));
  
  if (providers.length === 0) {
    console.warn('⚠️ (NO $) No job providers enabled');
    return {
      jobs: [],
      totalCount: 0,
      page: params.page || 1,
      pageSize: params.pageSize || 10,
      hasMore: false,
      source: 'linkedin', // Default
      cached: false,
      fetchedAt: new Date(),
    };
  }
  
  // Try to get cached results first
  for (const provider of providers) {
    const cached = getCachedResult(params, provider.name);
    if (cached) {
      // Apply freshness filter and sorting even to cached results
      const freshJobs = filterFreshJobs(cached.jobs, 14);
      const sortedJobs = sortJobsByRelevance(freshJobs, preferences);
      return {
        ...cached,
        jobs: sortedJobs,
      };
    }
  }
  
  // Fetch from all enabled providers in parallel
  const results = await Promise.all(
    providers.map(async (provider) => {
      try {
        const result = await provider.search(params);
        // Cache successful results
        if (result.jobs.length > 0) {
          setCachedResult(params, provider.name, result);
        }
        return result;
      } catch (error) {
        console.error(`❌ Provider ${provider.name} failed:`, error);
        return null;
      }
    })
  );
  
  // Merge results from all providers
  const allJobs: NormalizedJob[] = [];
  let totalCount = 0;
  
  for (const result of results) {
    if (result) {
      allJobs.push(...result.jobs);
      totalCount += result.totalCount;
    }
  }
  
  // Deduplicate across sources
  let dedupedJobs = deduplicateJobs(allJobs);

  // If user requested remote-only, filter out non-remote results
  if (preferences?.remoteOnly) {
    dedupedJobs = dedupedJobs.filter(job => job.isRemote);
  }
  
  // Filter to fresh jobs only
  const freshJobs = filterFreshJobs(dedupedJobs, 14);
  
  // Sort by relevance and recency
  const sortedJobs = sortJobsByRelevance(freshJobs, preferences);
  
  console.log(`✅ (NO $) Job search complete:`, {
    raw: allJobs.length,
    deduped: dedupedJobs.length,
    fresh: freshJobs.length,
  });
  
  return {
    jobs: sortedJobs,
    totalCount,
    page: params.page || 1,
    pageSize: params.pageSize || 10,
    hasMore: sortedJobs.length === (params.pageSize || 10),
    source: providers[0]?.name as any || 'linkedin',
    cached: false,
    fetchedAt: new Date(),
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Personalized Feed
// ────────────────────────────────────────────────────────────────────────────

export async function getPersonalizedFeed(
  userId: string,
  preferences: JobPreferences,
  limit = 20
): Promise<NormalizedJob[]> {
  console.log('🎯 (NO $) Getting personalized job feed for user:', userId);
  
  if (!hasEnabledProviders()) {
    console.warn('⚠️ (NO $) No job providers enabled for feed');
    return [];
  }

  const cacheKey = `${userId}:${preferences.remoteOnly ? 'remoteOnly' : 'any'}`;

  // Serve from cache if fresh (skip empty caches)
  const cached = feedCache.get(cacheKey);
  if (cached && cached.jobs.length > 0 && Date.now() - cached.fetchedAt < FEED_CACHE_TTL_MS) {
    console.log('🗄️ (NO $) Returning cached personalized feed:', cached.jobs.length, 'jobs');
    return cached.jobs.slice(0, limit);
  }
  
  // Build search queries from preferences
  const queries: JobSearchParams[] = [];
  
  // Primary query: user's preferred titles
  if (preferences.titles.length > 0) {
    for (const title of preferences.titles.slice(0, 3)) { // Max 3 title searches
      queries.push({
        query: title,
        location: preferences.locations[0] || undefined,
        remote: preferences.remotePreferred || undefined,
        datePosted: '2weeks',
        pageSize: Math.ceil(limit / Math.min(preferences.titles.length, 3)),
      });
    }
  }
  
  // Fallback: search by skills if no titles
  if (queries.length === 0 && preferences.skills.length > 0) {
    const skillQuery = preferences.skills.slice(0, 5).join(' ');
    queries.push({
      query: skillQuery,
      location: preferences.locations[0] || undefined,
      remote: preferences.remotePreferred || undefined,
      datePosted: '2weeks',
      pageSize: limit,
    });
  }
  
  // Execute all queries in parallel
  const results = await Promise.all(
    queries.map(params => searchJobs(params, preferences))
  );
  
  // Merge and deduplicate all results
  const allJobs: NormalizedJob[] = [];
  for (const result of results) {
    allJobs.push(...result.jobs);
  }
  
  let dedupedJobs = deduplicateJobs(allJobs);
  if (preferences.remoteOnly) {
    dedupedJobs = dedupedJobs.filter(job => job.isRemote);
  }
  const sortedJobs = sortJobsByRelevance(dedupedJobs, preferences);
  
  console.log(`✅ (NO $) Personalized feed: ${sortedJobs.length} jobs`);
  
  const finalJobs = sortedJobs.slice(0, limit);

  // Cache the full sorted list for 24h to limit provider calls
  feedCache.set(cacheKey, { jobs: sortedJobs, fetchedAt: Date.now() });

  return finalJobs;
}

// ────────────────────────────────────────────────────────────────────────────
// Saved Jobs
// ────────────────────────────────────────────────────────────────────────────

export async function saveJob(userId: string, job: NormalizedJob, notes?: string): Promise<SavedJob> {
  console.log('💾 (IS $) Saving job for user:', userId, job.title);
  
  const { data, error } = await supabaseAdmin
    .from('saved_jobs')
    .upsert({
      user_id: userId,
      job_id: job.id,
      job_data: job,
      notes,
      applied: false,
    }, {
      onConflict: 'user_id,job_id',
    })
    .select()
    .single();
  
  if (error) {
    console.error('❌ (IS $) Error saving job:', error);
    throw error;
  }
  
  return {
    id: data.id,
    userId: data.user_id,
    job: data.job_data as NormalizedJob,
    savedAt: new Date(data.created_at),
    notes: data.notes,
    applied: data.applied,
    appliedAt: data.applied_at ? new Date(data.applied_at) : undefined,
  };
}

export async function unsaveJob(userId: string, jobId: string): Promise<void> {
  console.log('🗑️ (IS $) Removing saved job:', jobId);
  
  const { error } = await supabaseAdmin
    .from('saved_jobs')
    .delete()
    .eq('user_id', userId)
    .eq('job_id', jobId);
  
  if (error) {
    console.error('❌ (IS $) Error unsaving job:', error);
    throw error;
  }
}

export async function getSavedJobs(userId: string): Promise<SavedJob[]> {
  console.log('📚 (IS $) Fetching saved jobs for user:', userId);
  
  const { data, error } = await supabaseAdmin
    .from('saved_jobs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('❌ (IS $) Error fetching saved jobs:', error);
    return [];
  }
  
  return (data || []).map((row: any) => ({
    id: row.id,
    userId: row.user_id,
    job: row.job_data as NormalizedJob,
    savedAt: new Date(row.created_at),
    notes: row.notes,
    applied: row.applied,
    appliedAt: row.applied_at ? new Date(row.applied_at) : undefined,
  }));
}

export async function markJobApplied(userId: string, jobId: string): Promise<void> {
  console.log('✅ (IS $) Marking job as applied:', jobId);
  
  const { error } = await supabaseAdmin
    .from('saved_jobs')
    .update({ 
      applied: true, 
      applied_at: new Date().toISOString() 
    })
    .eq('user_id', userId)
    .eq('job_id', jobId);
  
  if (error) {
    console.error('❌ (IS $) Error marking job applied:', error);
    throw error;
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Search History
// ────────────────────────────────────────────────────────────────────────────

export async function recordSearchHistory(
  userId: string, 
  params: JobSearchParams, 
  resultCount: number
): Promise<void> {
  console.log('📝 (IS $) Recording search history');
  
  const { error } = await supabaseAdmin
    .from('job_search_history')
    .insert({
      user_id: userId,
      search_params: params,
      result_count: resultCount,
    });
  
  if (error) {
    console.error('❌ (IS $) Error recording search history:', error);
    // Don't throw - this is non-critical
  }
}

export async function getSearchHistory(userId: string, limit = 10): Promise<SearchHistoryEntry[]> {
  console.log('📚 (IS $) Fetching search history');
  
  const { data, error } = await supabaseAdmin
    .from('job_search_history')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (error) {
    console.error('❌ (IS $) Error fetching search history:', error);
    return [];
  }
  
  return (data || []).map((row: any) => ({
    id: row.id,
    userId: row.user_id,
    params: row.search_params as JobSearchParams,
    resultCount: row.result_count,
    searchedAt: new Date(row.created_at),
  }));
}

// ────────────────────────────────────────────────────────────────────────────
// Saved Searches (Alerts)
// ────────────────────────────────────────────────────────────────────────────

export async function createSavedSearch(
  userId: string,
  name: string,
  params: JobSearchParams,
  notifyEmail = false
): Promise<SavedSearch> {
  console.log('💾 (IS $) Creating saved search:', name);
  
  const { data, error } = await supabaseAdmin
    .from('saved_searches')
    .insert({
      user_id: userId,
      name,
      search_params: params,
      notify_email: notifyEmail,
    })
    .select()
    .single();
  
  if (error) {
    console.error('❌ (IS $) Error creating saved search:', error);
    throw error;
  }
  
  return {
    id: data.id,
    userId: data.user_id,
    name: data.name,
    params: data.search_params as JobSearchParams,
    notifyEmail: data.notify_email,
    createdAt: new Date(data.created_at),
    lastRunAt: data.last_run_at ? new Date(data.last_run_at) : undefined,
  };
}

export async function getSavedSearches(userId: string): Promise<SavedSearch[]> {
  console.log('📚 (IS $) Fetching saved searches');
  
  const { data, error } = await supabaseAdmin
    .from('saved_searches')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('❌ (IS $) Error fetching saved searches:', error);
    return [];
  }
  
  return (data || []).map((row: any) => ({
    id: row.id,
    userId: row.user_id,
    name: row.name,
    params: row.search_params as JobSearchParams,
    notifyEmail: row.notify_email,
    createdAt: new Date(row.created_at),
    lastRunAt: row.last_run_at ? new Date(row.last_run_at) : undefined,
  }));
}

export async function deleteSavedSearch(userId: string, searchId: string): Promise<void> {
  console.log('🗑️ (IS $) Deleting saved search:', searchId);
  
  const { error } = await supabaseAdmin
    .from('saved_searches')
    .delete()
    .eq('user_id', userId)
    .eq('id', searchId);
  
  if (error) {
    console.error('❌ (IS $) Error deleting saved search:', error);
    throw error;
  }
}

// ────────────────────────────────────────────────────────────────────────────
// User Preferences
// ────────────────────────────────────────────────────────────────────────────

export async function getUserJobPreferences(userId: string): Promise<JobPreferences | null> {
  console.log('📚 (IS $) Fetching job preferences for user:', userId);
  
  const { data, error } = await supabaseAdmin
    .from('job_preferences')
    .select('*')
    .eq('user_id', userId)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') {
      // No preferences found
      return null;
    }
    console.error('❌ (IS $) Error fetching job preferences:', error);
    return null;
  }
  
  return {
    titles: data.titles || [],
    locations: data.locations || [],
    remotePreferred: data.remote_preferred || false,
    skills: data.skills || [],
    seniority: data.seniority || undefined,
    employmentTypes: data.employment_types || undefined,
    minSalary: data.min_salary || undefined,
    salaryPeriod: data.salary_period || undefined,
  };
}

export async function saveUserJobPreferences(
  userId: string, 
  preferences: JobPreferences
): Promise<void> {
  console.log('💾 (IS $) Saving job preferences for user:', userId);
  
  const { error } = await supabaseAdmin
    .from('job_preferences')
    .upsert({
      user_id: userId,
      titles: preferences.titles,
      locations: preferences.locations,
      remote_preferred: preferences.remotePreferred,
      skills: preferences.skills,
      seniority: preferences.seniority,
      employment_types: preferences.employmentTypes,
      min_salary: preferences.minSalary,
      salary_period: preferences.salaryPeriod,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id',
    });
  
  if (error) {
    console.error('❌ (IS $) Error saving job preferences:', error);
    throw error;
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Derive preferences from career profile
// ────────────────────────────────────────────────────────────────────────────

export async function derivePreferencesFromProfile(userId: string): Promise<JobPreferences> {
  console.log('🔍 (IS $) Deriving job preferences from profile:', userId);
  
  // Get user's profile for location and remote preferences
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('city, state, remote_preference')
    .eq('user_id', userId)
    .single();
  
  // Get user's experiences to extract titles
  const { data: experiences } = await supabaseAdmin
    .from('canonical_experiences')
    .select('primary_title, primary_location')
    .eq('user_id', userId)
    .order('is_current', { ascending: false })
    .order('end_date', { ascending: false, nullsFirst: true })
    .limit(5);
  
  // Get user's skills
  const { data: skills } = await supabaseAdmin
    .from('canonical_skills')
    .select('label')
    .eq('user_id', userId)
    .order('weight', { ascending: false })
    .limit(20);
  
  const titlesArray = (experiences || [])
    .map((e: any) => e.primary_title as string | null)
    .filter((t: string | null): t is string => Boolean(t));
  const titles: string[] = Array.from(new Set(titlesArray));
  
  // Build locations: prefer profile location, fallback to experience locations
  const locations: string[] = [];
  
  // Add profile location first if available
  if (profile?.city && profile?.state) {
    locations.push(`${profile.city}, ${profile.state}`);
  } else if (profile?.city) {
    locations.push(profile.city);
  } else if (profile?.state) {
    locations.push(profile.state);
  }
  
  // Add experience locations as fallback
  const expLocations = (experiences || [])
    .map((e: any) => e.primary_location as string | null)
    .filter((l: string | null): l is string => Boolean(l));
  for (const loc of expLocations) {
    if (!locations.includes(loc)) {
      locations.push(loc);
    }
  }
  
  const skillNames: string[] = (skills || []).map((s: any) => s.label as string);
  
  // Determine remote preference from profile
  const remotePref = profile?.remote_preference || 'any';
  const remoteOnly = remotePref === 'remote_only';
  const remotePreferred = remoteOnly || remotePref === 'hybrid' || remotePref === 'remote';
  
  console.log('🎯 (NO $) Derived preferences:', {
    titles: titles.slice(0, 3),
    locations: locations.slice(0, 2),
    remotePreferred,
    remotePref,
    skills: skillNames.length,
  });
  
  return {
    titles,
    locations,
    remotePreferred,
    remoteOnly,
    skills: skillNames,
  };
}

