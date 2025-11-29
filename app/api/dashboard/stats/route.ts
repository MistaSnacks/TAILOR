import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth-utils';

// 🔑 Environment variable logging (REMOVE IN PRODUCTION)
console.log('📊 Dashboard Stats API - Environment check:', {
  supabase: !!supabaseAdmin ? '✅' : '❌',
});

export async function GET(request: NextRequest) {
  console.log('📊 Dashboard Stats API - GET request received');

  try {
    const userId = await requireAuth();
    console.log('🔐 Dashboard Stats API - User authenticated:', userId ? '✅' : '❌');

    // Fetch all stats in parallel for performance
    const [
      documentsResult,
      resumesResult,
      recentResumesResult,
      profileResult,
      experiencesResult,
      skillsResult,
      atsScoresResult,
    ] = await Promise.all([
      // Count documents
      supabaseAdmin
        .from('documents')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId),

      // Count resumes
      supabaseAdmin
        .from('resume_versions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId),

      // Get recent resumes (last 3) with job info and ATS score
      supabaseAdmin
        .from('resume_versions')
        .select(`
          id,
          template,
          created_at,
          job:jobs(id, title, company),
          ats_score:ats_scores(score, analysis)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(3),

      // Get profile for completeness calculation
      supabaseAdmin
        .from('profiles')
        .select('full_name, email, phone_number, address, linkedin_url, portfolio_url')
        .eq('user_id', userId)
        .single(),

      // Count canonical experiences
      supabaseAdmin
        .from('canonical_experiences')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId),

      // Count canonical skills
      supabaseAdmin
        .from('canonical_skills')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId),

      // Get all resumes with ATS scores for average calculation
      supabaseAdmin
        .from('resume_versions')
        .select('id, ats_score:ats_scores(score)')
        .eq('user_id', userId),
    ]);

    // Calculate profile completeness based on profile fields only
    const profile = profileResult.data;
    const profileChecks = {
      full_name: !!profile?.full_name,
      email: !!profile?.email,
      phone_number: !!profile?.phone_number,
      address: !!profile?.address,
      linkedin_url: !!profile?.linkedin_url,
      portfolio_url: !!profile?.portfolio_url,
    };
    
    const completedFields = Object.values(profileChecks).filter(Boolean).length;
    const totalFields = Object.keys(profileChecks).length;
    const profileCompleteness = Math.round((completedFields / totalFields) * 100);

    // Debug logging (REMOVE IN PRODUCTION)
    console.log('👤 Profile completeness check:', {
      ...profileChecks,
      completed: completedFields,
      total: totalFields,
      percentage: profileCompleteness,
    });

    // Format recent resumes - flatten the ats_score array
    const recentResumes = (recentResumesResult.data || []).map((resume: any) => ({
      id: resume.id,
      template: resume.template,
      created_at: resume.created_at,
      job: resume.job,
      ats_score: resume.ats_score?.[0] || null,
    }));

    // Calculate average ATS score
    const allScores = (atsScoresResult.data || [])
      .map((r: any) => r.ats_score?.[0]?.score)
      .filter((score: any) => typeof score === 'number');
    
    const averageAtsScore = allScores.length > 0 
      ? Math.round(allScores.reduce((sum: number, score: number) => sum + score, 0) / allScores.length)
      : null;

    const stats = {
      documentsCount: documentsResult.count || 0,
      resumesCount: resumesResult.count || 0,
      recentResumes,
      profileCompleteness,
      experienceCount: experiencesResult.count || 0,
      skillsCount: skillsResult.count || 0,
      averageAtsScore,
    };

    console.log('📊 Dashboard Stats:', {
      documents: stats.documentsCount,
      resumes: stats.resumesCount,
      recentResumes: stats.recentResumes.length,
      profileCompleteness: stats.profileCompleteness,
      experiences: stats.experienceCount,
      skills: stats.skillsCount,
      averageAtsScore: stats.averageAtsScore,
    });

    return NextResponse.json(stats);
  } catch (error: any) {
    console.error('❌ Dashboard stats error:', error);

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
