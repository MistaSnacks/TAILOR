import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import {
  getPersonalizedFeed,
  getUserJobPreferences,
  derivePreferencesFromProfile
} from '@/lib/jobs/service';
import { getRecommendedJobs } from '@/lib/jobs/recommendations';
import { hasEnabledProviders } from '@/lib/jobs/providers';

const isDev = process.env.NODE_ENV !== 'production';

export async function GET(request: NextRequest) {
  if (isDev) console.log('📰 Jobs Feed API - GET request received');

  try {
    const userId = await requireAuth();
    console.log('🔐 Jobs Feed API - User authenticated:', userId ? '✅' : '❌');

    // Get limit from query params
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50);

    // PRIORITY 1: Check for stored recommended jobs (populated on first resume, refreshed weekly)
    const { jobs: recommendedJobs, lastRefreshed } = await getRecommendedJobs(userId, limit);

    if (recommendedJobs.length > 0) {
      console.log(`✅ (NO $) Returning ${recommendedJobs.length} stored recommended jobs (last refreshed: ${lastRefreshed?.toISOString()})`);
      return NextResponse.json({
        jobs: recommendedJobs,
        count: recommendedJobs.length,
        lastRefreshed: lastRefreshed?.toISOString(),
        source: 'recommended',
        providersEnabled: true,
      });
    }

    // FALLBACK: No stored jobs - this means user hasn't generated a resume yet
    // Check if providers are enabled for live search fallback
    if (!hasEnabledProviders()) {
      console.log('⚠️ (NO $) No job providers enabled');
      return NextResponse.json({
        jobs: [],
        message: 'Job search is not configured. Enable a job provider to see personalized jobs.',
        providersEnabled: false,
      });
    }

    // Get user preferences or derive from profile
    let preferences = await getUserJobPreferences(userId);

    if (!preferences || (preferences.titles.length === 0 && preferences.skills.length === 0)) {
      console.log('🔄 (IS $) Deriving preferences from profile');
      preferences = await derivePreferencesFromProfile(userId);
    }

    // Check if we have enough data to generate a feed
    if (preferences.titles.length === 0 && preferences.skills.length === 0) {
      console.log('⚠️ (NO $) No profile data to generate feed');
      return NextResponse.json({
        jobs: [],
        message: 'Generate a resume to see personalized job recommendations.',
        needsResume: true,
      });
    }

    console.log('🎯 (IS $) Live search fallback - generating personalized feed with preferences:', {
      titles: preferences.titles.slice(0, 3),
      skills: preferences.skills.length,
      remote: preferences.remotePreferred,
    });

    const jobs = await getPersonalizedFeed(userId, preferences, limit);

    return NextResponse.json({
      jobs,
      count: jobs.length,
      preferences: {
        titles: preferences.titles,
        locations: preferences.locations,
        remotePreferred: preferences.remotePreferred,
      },
      source: 'live',
      providersEnabled: true,
    });
  } catch (error: unknown) {
    console.error('❌ Jobs Feed API error:', error);

    const message = error instanceof Error ? error.message : 'Unknown error';
    if (message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
