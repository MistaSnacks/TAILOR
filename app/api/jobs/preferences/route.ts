import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { 
  getUserJobPreferences, 
  saveUserJobPreferences,
  derivePreferencesFromProfile,
} from '@/lib/jobs/service';
import type { JobPreferences } from '@/lib/jobs/types';

const isDev = process.env.NODE_ENV !== 'production';

// GET - Get user job preferences
export async function GET(request: NextRequest) {
  if (isDev) console.log('⚙️ Job Preferences API - GET request received');
  
  try {
    const userId = await requireAuth();
    if (isDev) console.log('🔐 Job Preferences API - User authenticated:', userId ? '✅' : '❌');
    
    const { searchParams } = new URL(request.url);
    const derive = searchParams.get('derive') === 'true';
    
    let preferences = await getUserJobPreferences(userId);
    
    // If no preferences and derive requested, build from profile
    if (!preferences && derive) {
      preferences = await derivePreferencesFromProfile(userId);
    }
    
    return NextResponse.json({
      preferences,
      derived: !preferences,
    });
  } catch (error: any) {
    console.error('❌ Job Preferences API GET error:', error);
    
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Save job preferences
export async function POST(request: NextRequest) {
  console.log('⚙️ Job Preferences API - POST request received');
  
  try {
    const userId = await requireAuth();
    console.log('🔐 Job Preferences API - User authenticated:', userId ? '✅' : '❌');
    
    const body = await request.json();
    const preferences = body as JobPreferences;
    
    // Validate required fields
    if (!preferences.titles || !Array.isArray(preferences.titles)) {
      return NextResponse.json({ 
        error: 'Titles must be an array' 
      }, { status: 400 });
    }
    
    await saveUserJobPreferences(userId, {
      titles: preferences.titles || [],
      locations: preferences.locations || [],
      remotePreferred: preferences.remotePreferred || false,
      skills: preferences.skills || [],
      seniority: preferences.seniority,
      employmentTypes: preferences.employmentTypes,
      minSalary: preferences.minSalary,
      salaryPeriod: preferences.salaryPeriod,
    });
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('❌ Job Preferences API POST error:', error);
    
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}




