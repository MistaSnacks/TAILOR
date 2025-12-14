import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth-utils';

const isDev = process.env.NODE_ENV !== 'production';

export async function GET(request: NextRequest) {
  if (isDev) console.log('📄 Resumes API - GET request received');
  
  try {
    const userId = await requireAuth();
    if (isDev) console.log('🔐 Resumes API - User authenticated:', userId ? '✅' : '❌');

    const { data: resumes, error } = await supabaseAdmin
      .from('resume_versions')
      .select(`
        *,
        job:jobs(*),
        ats_score:ats_scores(*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch resumes' },
        { status: 500 }
      );
    }

    // Flatten ats_scores array to single object
    const formattedResumes = resumes?.map((resume: any) => ({
      ...resume,
      ats_score: resume.ats_score?.[0] || null,
    }));

    return NextResponse.json({ resumes: formattedResumes });
  } catch (error: any) {
    console.error('❌ Fetch error:', error);
    
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

