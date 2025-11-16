import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const userId = 'placeholder-user-id';

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
  } catch (error) {
    console.error('Fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

