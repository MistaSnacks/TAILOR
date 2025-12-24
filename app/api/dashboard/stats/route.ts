import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth-utils';

export async function GET(request: NextRequest) {
  try {
    const userId = await requireAuth();

    // Fetch all stats in parallel for performance
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [
      documentsResult,
      resumesResult,
      recentResumesResult,
      profileResult,
      experiencesResult,
      skillsResult,
      atsScoresResult,
      userResult,
      subscriptionResult,
      monthlyResumesResult,
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

      // Get user legacy status and bonus generations
      supabaseAdmin
        .from('users')
        .select('is_legacy, bonus_generations, bonus_generations_expires_at')
        .eq('id', userId)
        .single(),

      // Get subscription tier
      supabaseAdmin
        .from('user_subscriptions')
        .select('tier, status')
        .eq('user_id', userId)
        .single(),

      // Count resumes created this month
      supabaseAdmin
        .from('resume_versions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', startOfMonth.toISOString()),
    ]);


    // Check each result for errors individually
    if (documentsResult.error) {
      console.error('Error fetching documents count:', documentsResult.error);
      return NextResponse.json(
        { error: 'Failed to fetch documents count', details: documentsResult.error.message },
        { status: 500 }
      );
    }

    if (resumesResult.error) {
      console.error('Error fetching resumes count:', resumesResult.error);
      return NextResponse.json(
        { error: 'Failed to fetch resumes count', details: resumesResult.error.message },
        { status: 500 }
      );
    }

    if (recentResumesResult.error) {
      console.error('Error fetching recent resumes:', recentResumesResult.error);
      return NextResponse.json(
        { error: 'Failed to fetch recent resumes', details: recentResumesResult.error.message },
        { status: 500 }
      );
    }

    if (profileResult.error) {
      console.error('Error fetching profile:', profileResult.error);
      return NextResponse.json(
        { error: 'Failed to fetch profile', details: profileResult.error.message },
        { status: 500 }
      );
    }

    if (experiencesResult.error) {
      console.error('Error fetching experiences count:', experiencesResult.error);
      return NextResponse.json(
        { error: 'Failed to fetch experiences count', details: experiencesResult.error.message },
        { status: 500 }
      );
    }

    if (skillsResult.error) {
      console.error('Error fetching skills count:', skillsResult.error);
      return NextResponse.json(
        { error: 'Failed to fetch skills count', details: skillsResult.error.message },
        { status: 500 }
      );
    }

    if (atsScoresResult.error) {
      console.error('Error fetching ATS scores:', atsScoresResult.error);
      return NextResponse.json(
        { error: 'Failed to fetch ATS scores', details: atsScoresResult.error.message },
        { status: 500 }
      );
    }

    // Validate data types before processing
    const recentResumesData = Array.isArray(recentResumesResult.data) ? recentResumesResult.data : [];
    const atsScoresData = Array.isArray(atsScoresResult.data) ? atsScoresResult.data : [];

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

    // Format recent resumes - flatten the ats_score array
    const recentResumes = recentResumesData.map((resume: any) => ({
      id: resume.id,
      template: resume.template,
      created_at: resume.created_at,
      job: resume.job,
      ats_score: resume.ats_score?.[0] || null,
    }));

    // Calculate average ATS score
    const allScores = atsScoresData
      .map((r: any) => r.ats_score?.[0]?.score)
      .filter((score: any) => typeof score === 'number');

    const averageAtsScore = allScores.length > 0
      ? Math.round(allScores.reduce((sum: number, score: number) => sum + score, 0) / allScores.length)
      : null;

    // Calculate generation limits and usage
    const FREE_MONTHLY_LIMIT = 5;
    const userData = userResult.data;
    const subscriptionData = subscriptionResult.data;

    const isLegacy = userData?.is_legacy || false;
    const isPaid = subscriptionData?.tier === 'standard' && subscriptionData?.status === 'active';
    const hasUnlimitedGenerations = isLegacy || isPaid;

    // Check bonus generations expiry
    let activeBonusGenerations = 0;
    if (userData?.bonus_generations && userData?.bonus_generations > 0) {
      if (userData.bonus_generations_expires_at) {
        const expiresAt = new Date(userData.bonus_generations_expires_at);
        if (expiresAt > new Date()) {
          activeBonusGenerations = userData.bonus_generations;
        }
      } else {
        // No expiry set, bonus is active
        activeBonusGenerations = userData.bonus_generations;
      }
    }

    const monthlyUsed = monthlyResumesResult.count || 0;
    const baseLimit = hasUnlimitedGenerations ? Infinity : FREE_MONTHLY_LIMIT;
    const totalLimit = hasUnlimitedGenerations ? Infinity : FREE_MONTHLY_LIMIT + activeBonusGenerations;
    const remaining = hasUnlimitedGenerations ? Infinity : Math.max(0, totalLimit - monthlyUsed);

    const stats = {
      documentsCount: documentsResult.count || 0,
      resumesCount: resumesResult.count || 0,
      recentResumes,
      profileCompleteness,
      experienceCount: experiencesResult.count || 0,
      skillsCount: skillsResult.count || 0,
      averageAtsScore,
      // Generation transparency fields
      generationUsage: {
        monthlyUsed,
        monthlyLimit: hasUnlimitedGenerations ? null : totalLimit,
        remaining: hasUnlimitedGenerations ? null : remaining,
        hasUnlimited: hasUnlimitedGenerations,
        bonusGenerations: activeBonusGenerations,
        isLegacy,
        isPaid,
      },
    };

    return NextResponse.json(stats);
  } catch (error: any) {
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
