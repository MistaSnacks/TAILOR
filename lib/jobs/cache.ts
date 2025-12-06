// Job Search Cache Layer
// In-memory cache with TTL for job search results
// Production should use Redis or similar

import type { JobSearchParams, JobSearchResult, NormalizedJob } from './types';
import crypto from 'crypto';

// Cache configuration
const CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours
const MAX_CACHE_ENTRIES = 500;
const FRESHNESS_DAYS = 14;

type CacheEntry = {
  result: JobSearchResult;
  expiresAt: number;
  createdAt: number;
};

// In-memory cache (use Redis in production)
const searchCache = new Map<string, CacheEntry>();
const dedupIndex = new Map<string, NormalizedJob>(); // dedupHash -> canonical job

// Generate cache key from search params
function generateCacheKey(params: JobSearchParams, source: string): string {
  const normalized = {
    query: params.query.toLowerCase().trim(),
    location: (params.location || '').toLowerCase().trim(),
    remote: params.remote || false,
    employmentType: params.employmentType || '',
    datePosted: params.datePosted || '2weeks',
    page: params.page || 1,
    pageSize: params.pageSize || 10,
    source,
  };
  
  const input = JSON.stringify(normalized);
  return crypto.createHash('sha256').update(input).digest('hex').slice(0, 24);
}

// Get cached result if fresh
export function getCachedResult(params: JobSearchParams, source: string): JobSearchResult | null {
  const key = generateCacheKey(params, source);
  const entry = searchCache.get(key);
  
  if (!entry) {
    return null;
  }
  
  // Check expiration
  if (Date.now() > entry.expiresAt) {
    searchCache.delete(key);
    console.log('🗑️ (NO $) Cache expired for:', key.slice(0, 8));
    return null;
  }
  
  console.log('✅ (NO $) Cache hit for:', key.slice(0, 8), {
    jobs: entry.result.jobs.length,
    age: Math.round((Date.now() - entry.createdAt) / 1000 / 60) + 'm',
  });
  
  return {
    ...entry.result,
    cached: true,
  };
}

// Store result in cache
export function setCachedResult(params: JobSearchParams, source: string, result: JobSearchResult): void {
  const key = generateCacheKey(params, source);
  
  // Evict oldest entries if cache is full
  if (searchCache.size >= MAX_CACHE_ENTRIES) {
    evictOldestEntries(Math.floor(MAX_CACHE_ENTRIES * 0.2)); // Remove 20%
  }
  
  const entry: CacheEntry = {
    result: {
      ...result,
      cached: false, // Will be set to true when retrieved
    },
    expiresAt: Date.now() + CACHE_TTL_MS,
    createdAt: Date.now(),
  };
  
  searchCache.set(key, entry);
  
  // Update dedup index with these jobs
  for (const job of result.jobs) {
    updateDedupIndex(job);
  }
  
  console.log('💾 (NO $) Cached result:', key.slice(0, 8), {
    jobs: result.jobs.length,
    ttlHours: CACHE_TTL_MS / 1000 / 60 / 60,
  });
}

// Evict oldest cache entries
function evictOldestEntries(count: number): void {
  const entries = Array.from(searchCache.entries())
    .sort((a, b) => a[1].createdAt - b[1].createdAt);
  
  for (let i = 0; i < Math.min(count, entries.length); i++) {
    searchCache.delete(entries[i][0]);
  }
  
  console.log('🗑️ (NO $) Evicted', count, 'cache entries');
}

// Update dedup index with a job
function updateDedupIndex(job: NormalizedJob): void {
  const existing = dedupIndex.get(job.dedupHash);
  
  if (!existing) {
    dedupIndex.set(job.dedupHash, job);
    return;
  }
  
  // Prefer job with richer description
  const existingDescLen = existing.description?.length || 0;
  const newDescLen = job.description?.length || 0;
  
  if (newDescLen > existingDescLen) {
    dedupIndex.set(job.dedupHash, job);
  }
}

// Deduplicate jobs across sources
export function deduplicateJobs(jobs: NormalizedJob[]): NormalizedJob[] {
  const seen = new Set<string>();
  const result: NormalizedJob[] = [];
  
  for (const job of jobs) {
    // Check if dedupHash is missing
    if (!job.dedupHash) {
      result.push(job);
      continue;
    }
    
    // Check if we've already seen this dedupHash in this batch
    if (seen.has(job.dedupHash)) {
      continue;
    }
    
    // Check global dedup index for canonical version
    const canonical = dedupIndex.get(job.dedupHash);
    if (canonical) {
      // Use canonical if it has a richer description
      const useCanonical = (canonical.description?.length || 0) > (job.description?.length || 0);
      result.push(useCanonical ? canonical : job);
    } else {
      result.push(job);
      dedupIndex.set(job.dedupHash, job);
    }
    
    seen.add(job.dedupHash);
  }
  
  return result;
}

// Filter jobs to ensure freshness (within last N days)
export function filterFreshJobs(jobs: NormalizedJob[], maxAgeDays = FRESHNESS_DAYS): NormalizedJob[] {
  const cutoff = new Date(Date.now() - maxAgeDays * 24 * 60 * 60 * 1000);
  
  return jobs.filter(job => {
    const postedAt = job.postedAt instanceof Date ? job.postedAt : new Date(job.postedAt);
    return postedAt >= cutoff;
  });
}

// Sort jobs by relevance and recency
export function sortJobsByRelevance(
  jobs: NormalizedJob[], 
  preferences?: { titles?: string[]; skills?: string[] }
): NormalizedJob[] {
  return jobs.sort((a, b) => {
    // Recency score (stronger weight for more recent)
    const ageA = Date.now() - new Date(a.postedAt).getTime();
    const ageB = Date.now() - new Date(b.postedAt).getTime();
    const recencyDiff = ageA - ageB; // Negative = a is more recent
    
    // Title match score if preferences provided
    let titleScoreA = 0;
    let titleScoreB = 0;
    
    if (preferences?.titles?.length) {
      const titleLower = (t: string) => t.toLowerCase();
      for (const prefTitle of preferences.titles) {
        const pref = prefTitle.toLowerCase();
        if (a.title.toLowerCase().includes(pref)) titleScoreA += 10;
        if (b.title.toLowerCase().includes(pref)) titleScoreB += 10;
      }
    }
    
    // Skill match score if preferences provided
    let skillScoreA = 0;
    let skillScoreB = 0;
    
    if (preferences?.skills?.length) {
      const aDesc = (a.description || '').toLowerCase();
      const bDesc = (b.description || '').toLowerCase();
      for (const skill of preferences.skills) {
        const skillLower = skill.toLowerCase();
        if (aDesc.includes(skillLower)) skillScoreA += 1;
        if (bDesc.includes(skillLower)) skillScoreB += 1;
      }
    }
    
    // Combined score (title match > skill match > recency)
    const totalA = titleScoreA * 100 + skillScoreA * 10 - (ageA / 86400000); // Days as decimal
    const totalB = titleScoreB * 100 + skillScoreB * 10 - (ageB / 86400000);
    
    return totalB - totalA; // Higher score first
  });
}

// Get cache stats for monitoring
export function getCacheStats(): {
  searchCacheSize: number;
  dedupIndexSize: number;
  oldestEntry: number | null;
  newestEntry: number | null;
} {
  const entries = Array.from(searchCache.values());
  const timestamps = entries.map(e => e.createdAt);
  
  return {
    searchCacheSize: searchCache.size,
    dedupIndexSize: dedupIndex.size,
    oldestEntry: timestamps.length ? Math.min(...timestamps) : null,
    newestEntry: timestamps.length ? Math.max(...timestamps) : null,
  };
}

// Clear all caches (for testing/maintenance)
export function clearAllCaches(): void {
  searchCache.clear();
  dedupIndex.clear();
  console.log('🗑️ (NO $) All caches cleared');
}

