// Job Recommendations Service
// Handles populating and refreshing personalized job recommendations

import type { NormalizedJob, JobPreferences } from './types';
import { searchJobs } from './service';
import { derivePreferencesFromProfile } from './service';
import { deduplicateJobs, filterFreshJobs, sortJobsByRelevance } from './cache';
import { supabaseAdmin } from '../supabase';
import type { ResumeContent } from '../resume-content';

const MAX_RECOMMENDED_JOBS = 25;

// ────────────────────────────────────────────────────────────────────────────
// Extract job search preferences from a generated resume
// ────────────────────────────────────────────────────────────────────────────

export function extractPreferencesFromResume(resume: ResumeContent): JobPreferences {
    const titles: string[] = [];
    const skills: string[] = [];

    // Extract job titles from experience
    if (resume.experience && Array.isArray(resume.experience)) {
        for (const exp of resume.experience) {
            if (exp.title && !titles.includes(exp.title)) {
                titles.push(exp.title);
            }
        }
    }

    // Extract skills
    if (resume.skills && Array.isArray(resume.skills)) {
        for (const skill of resume.skills) {
            if (typeof skill === 'string') {
                skills.push(skill);
            } else if (skill && typeof skill === 'object' && 'name' in skill) {
                skills.push((skill as { name: string }).name);
            }
        }
    }

    // Extract location from contact info if available
    const locations: string[] = [];
    if (resume.contact?.location) {
        locations.push(resume.contact.location);
    }

    console.log('📋 Extracted preferences from resume:', {
        titles: titles.slice(0, 5),
        skills: skills.length,
        locations: locations.length,
    });

    return {
        titles: titles.slice(0, 5),
        locations,
        skills: skills.slice(0, 20),
        remotePreferred: false, // Default, can be overridden by profile
    };
}

// ────────────────────────────────────────────────────────────────────────────
// Populate fresh jobs for a user
// ────────────────────────────────────────────────────────────────────────────

export async function populateFreshJobs(
    userId: string,
    resume?: ResumeContent
): Promise<{ count: number; error?: string }> {
    console.log('🚀 Populating fresh jobs for user:', userId);

    try {
        // Get preferences from resume or derive from profile
        let preferences: JobPreferences;

        if (resume) {
            preferences = extractPreferencesFromResume(resume);
        } else {
            preferences = await derivePreferencesFromProfile(userId);
        }

        // Validate we have enough data to search
        if (preferences.titles.length === 0 && preferences.skills.length === 0) {
            console.warn('⚠️ No titles or skills to search for jobs');
            return { count: 0, error: 'Insufficient profile data to search for jobs' };
        }

        // Build search queries
        const allJobs: NormalizedJob[] = [];

        // Search by each title (max 3)
        for (const title of preferences.titles.slice(0, 3)) {
            try {
                const result = await searchJobs({
                    query: title,
                    location: preferences.locations[0],
                    remote: preferences.remotePreferred,
                    datePosted: '2weeks',
                    pageSize: 15,
                });
                allJobs.push(...result.jobs);
            } catch (err) {
                console.error(`❌ Search failed for title "${title}":`, err);
            }
        }

        // If no titles, search by skills
        if (preferences.titles.length === 0 && preferences.skills.length > 0) {
            const skillQuery = preferences.skills.slice(0, 5).join(' ');
            try {
                const result = await searchJobs({
                    query: skillQuery,
                    location: preferences.locations[0],
                    remote: preferences.remotePreferred,
                    datePosted: '2weeks',
                    pageSize: 20,
                });
                allJobs.push(...result.jobs);
            } catch (err) {
                console.error('❌ Skill-based search failed:', err);
            }
        }

        // Deduplicate, filter fresh, and sort
        const dedupedJobs = deduplicateJobs(allJobs);
        const freshJobs = filterFreshJobs(dedupedJobs, 14);
        const sortedJobs = sortJobsByRelevance(freshJobs, preferences);
        const finalJobs = sortedJobs.slice(0, MAX_RECOMMENDED_JOBS);

        console.log('📊 Job search results:', {
            raw: allJobs.length,
            deduped: dedupedJobs.length,
            fresh: freshJobs.length,
            final: finalJobs.length,
        });

        if (finalJobs.length === 0) {
            console.warn('⚠️ No jobs found for user');
            return { count: 0, error: 'No jobs found matching your profile' };
        }

        // Atomically replace recommended jobs using database function
        // This prevents race conditions by doing delete + insert in a single transaction
        const jobRecords = finalJobs.map((job) => ({
            job_data: job,
        }));

        const { data: result, error: rpcError } = await supabaseAdmin.rpc(
            'replace_recommended_jobs_atomic',
            {
                p_user_id: userId,
                p_job_records: jobRecords,
            }
        );

        if (rpcError) {
            console.error('❌ Failed to replace recommended jobs:', rpcError);
            return { count: 0, error: 'Failed to save recommended jobs' };
        }

        // Check result from database function
        if (!result || !result.success) {
            const errorMessage = result?.error || 'Failed to save recommended jobs';
            console.error('❌ Atomic replace failed:', errorMessage);
            return { count: 0, error: errorMessage };
        }

        console.log(`✅ Populated ${result.count} recommended jobs for user`);
        return { count: result.count };
    } catch (error: any) {
        console.error('❌ Error populating fresh jobs:', error);
        return { count: 0, error: error.message || 'Unknown error' };
    }
}

// ────────────────────────────────────────────────────────────────────────────
// Get recommended jobs from database
// ────────────────────────────────────────────────────────────────────────────

export async function getRecommendedJobs(
    userId: string,
    limit = 20
): Promise<{ jobs: NormalizedJob[]; lastRefreshed: Date | null }> {
    console.log('📚 Fetching recommended jobs for user:', userId);

    const { data, error } = await supabaseAdmin
        .from('recommended_jobs')
        .select('job_data, updated_at')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(limit);

    if (error) {
        console.error('❌ Failed to fetch recommended jobs:', error);
        return { jobs: [], lastRefreshed: null };
    }

    if (!data || data.length === 0) {
        return { jobs: [], lastRefreshed: null };
    }

    const jobs = data.map((row: any) => row.job_data as NormalizedJob);
    const lastRefreshed = data[0]?.updated_at ? new Date(data[0].updated_at) : null;

    console.log(`✅ Found ${jobs.length} recommended jobs, last refreshed: ${lastRefreshed?.toISOString()}`);
    return { jobs, lastRefreshed };
}

// ────────────────────────────────────────────────────────────────────────────
// Check if user has recommended jobs
// ────────────────────────────────────────────────────────────────────────────

export async function hasRecommendedJobs(userId: string): Promise<boolean> {
    const { count, error } = await supabaseAdmin
        .from('recommended_jobs')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId);

    if (error) {
        console.error('❌ Failed to check recommended jobs:', error);
        return false;
    }

    return (count || 0) > 0;
}
