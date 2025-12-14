import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { 
  searchJobs, 
  recordSearchHistory,
  getUserJobPreferences,
} from '@/lib/jobs/service';
import { hasEnabledProviders } from '@/lib/jobs/providers';
import type { JobSearchParams } from '@/lib/jobs/types';

const isDev = process.env.NODE_ENV !== 'production';

export async function GET(request: NextRequest) {
  if (isDev) console.log('🔍 Jobs Search API - GET request received');
  
  try {
    const userId = await requireAuth();
    console.log('🔐 Jobs Search API - User authenticated:', userId ? '✅' : '❌');
    
    // Check if any providers are enabled
    if (!hasEnabledProviders()) {
      console.log('⚠️ (NO $) No job providers enabled');
      return NextResponse.json({ 
        jobs: [],
        totalCount: 0,
        page: 1,
        pageSize: 10,
        hasMore: false,
        message: 'Job search is not configured. Enable a job provider.',
        providersEnabled: false,
      });
    }
    
    // Parse search params
    const { searchParams: urlParams } = new URL(request.url);
    
    const query = urlParams.get('q') || urlParams.get('query') || '';
    if (!query.trim()) {
      return NextResponse.json({ 
        error: 'Search query is required',
      }, { status: 400 });
    }
    
    const params: JobSearchParams = {
      query: query.trim(),
      location: urlParams.get('location') || undefined,
      remote: urlParams.get('remote') === 'true' || undefined,
      employmentType: (urlParams.get('type') as any) || undefined,
      datePosted: (urlParams.get('date') as any) || '2weeks',
      page: parseInt(urlParams.get('page') || '1', 10),
      pageSize: Math.min(parseInt(urlParams.get('limit') || '20', 10), 50),
    };
    
    console.log('🔍 (NO $) Search params:', params);
    
    // Get user preferences for ranking boost
    const preferences = await getUserJobPreferences(userId);
    
    // Execute search
    const result = await searchJobs(params, preferences || undefined);
    
    // Record search history (fire-and-forget)
    recordSearchHistory(userId, params, result.jobs.length).catch(err => {
      console.error('⚠️ Failed to record search history:', err);
    });
    
    return NextResponse.json({
      ...result,
      providersEnabled: true,
    });
  } catch (error: any) {
    console.error('❌ Jobs Search API error:', error);
    
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

