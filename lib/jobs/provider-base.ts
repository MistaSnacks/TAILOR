// Base provider interface for job search providers

import type { JobSearchParams, JobSearchResult, NormalizedJob } from './types';
import crypto from 'crypto';

export interface JobProvider {
  name: string;
  enabled: boolean;
  search(params: JobSearchParams): Promise<JobSearchResult>;
}

// Generate a dedup hash for a job listing
// Hash on (normalized_title, company, metro, apply_domain) to detect duplicates across sources
export function generateDedupHash(job: {
  title: string;
  company: string;
  location: string;
  applyUrl: string;
}): string {
  const normalizedTitle = normalizeString(job.title);
  const normalizedCompany = normalizeString(job.company);
  const metro = extractMetro(job.location);
  const applyDomain = extractDomain(job.applyUrl);
  
  const input = `${normalizedTitle}|${normalizedCompany}|${metro}|${applyDomain}`;
  return crypto.createHash('sha256').update(input).digest('hex').slice(0, 16);
}

function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractMetro(location: string): string {
  // Extract city/metro from location string
  // "San Francisco, CA, USA" → "san francisco"
  // "Remote" → "remote"
  const normalized = location.toLowerCase().trim();
  if (normalized.includes('remote')) {
    return 'remote';
  }
  // Take first part before comma
  const parts = normalized.split(',');
  return parts[0].trim().replace(/[^a-z0-9\s]/g, '');
}

function extractDomain(url: string): string {
  try {
    const parsed = new URL(url);
    // Remove www. prefix and common job board domains to focus on company domain
    return parsed.hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return 'unknown';
  }
}

// Check if a job is within the freshness window (default 14 days)
export function isJobFresh(postedAt: Date, maxAgeDays = 14): boolean {
  const now = new Date();
  const cutoff = new Date(now.getTime() - maxAgeDays * 24 * 60 * 60 * 1000);
  return postedAt >= cutoff;
}

// Parse various date formats from job APIs
export function parseJobDate(dateValue: string | number | Date | undefined): Date {
  if (!dateValue) {
    return new Date();
  }
  
  if (dateValue instanceof Date) {
    return dateValue;
  }
  
  // Unix timestamp (seconds)
  if (typeof dateValue === 'number') {
    // If it's in seconds (< year 3000 in seconds), convert to ms
    const ts = dateValue < 100000000000 ? dateValue * 1000 : dateValue;
    return new Date(ts);
  }
  
  // ISO string or other date string
  const parsed = new Date(dateValue);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }
  
  // Relative date strings like "2 days ago", "1 week ago"
  const relativeMatch = dateValue.match(/(\d+)\s*(day|week|month|hour)s?\s*ago/i);
  if (relativeMatch) {
    const [, amount, unit] = relativeMatch;
    const now = new Date();
    const multipliers: Record<string, number> = {
      hour: 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000,
      month: 30 * 24 * 60 * 60 * 1000,
    };
    return new Date(now.getTime() - parseInt(amount) * (multipliers[unit.toLowerCase()] || 0));
  }
  
  // Default to now if unparseable
  return new Date();
}


