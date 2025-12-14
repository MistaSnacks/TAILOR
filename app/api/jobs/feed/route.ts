import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { 
  getPersonalizedFeed, 
  getUserJobPreferences, 
  derivePreferencesFromProfile 
} from '@/lib/jobs/service';
import { hasEnabledProviders } from '@/lib/jobs/providers';

const isDev = process.env.NODE_ENV !== 'production';

export async function GET(request: NextRequest) {
  if (isDev) console.log('📰 Jobs Feed API - GET request received');
  
  try {
    const userId = await requireAuth();
    console.log('🔐 Jobs Feed API - User authenticated:', userId ? '✅' : '❌');
    
    // Check if any providers are enabled
    if (!hasEnabledProviders()) {
      console.log('⚠️ (NO $) No job providers enabled');
      return NextResponse.json({ 
        jobs: [], 
        message: 'Job search is not configured. Enable a job provider to see personalized jobs.',
        providersEnabled: false,
      });
    }
    
    // Get limit from query params
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50);
    
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
        message: 'Upload a resume to see personalized job recommendations.',
        needsProfile: true,
      });
    }
    
    console.log('🎯 (NO $) Generating personalized feed with preferences:', {
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
      providersEnabled: true,
    });
  } catch (error: any) {
    console.error('❌ Jobs Feed API error:', error);
    
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

