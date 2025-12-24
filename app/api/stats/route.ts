import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth-utils';

/**
 * Fetch platform and user statistics
 */
export async function fetchStats(userId: string) {
  // Get total counts
  const [
    { count: totalUsers, error: usersError },
    { count: totalResumes, error: resumesError },
    { count: totalDocuments, error: documentsError },
    { count: totalJobs, error: jobsError }
  ] = await Promise.all([
    supabaseAdmin.from('users').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('resume_versions').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('documents').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('jobs').select('*', { count: 'exact', head: true })
  ]);

  if (usersError || resumesError || documentsError || jobsError) {
    throw new Error('Failed to fetch stats');
  }

  // Get user-specific counts
  const [
    { count: userResumes },
    { count: userDocuments },
    { count: userJobs }
  ] = await Promise.all([
    supabaseAdmin.from('resume_versions').select('*', { count: 'exact', head: true }).eq('user_id', userId),
    supabaseAdmin.from('documents').select('*', { count: 'exact', head: true }).eq('user_id', userId),
    supabaseAdmin.from('jobs').select('*', { count: 'exact', head: true }).eq('user_id', userId)
  ]);

  // Calculate averages
  const avgResumesPerUser = totalUsers && totalUsers > 0 
    ? ((totalResumes || 0) / totalUsers).toFixed(2)
    : '0.00';
  const avgDocumentsPerUser = totalUsers && totalUsers > 0
    ? ((totalDocuments || 0) / totalUsers).toFixed(2)
    : '0.00';
  const avgJobsPerUser = totalUsers && totalUsers > 0
    ? ((totalJobs || 0) / totalUsers).toFixed(2)
    : '0.00';

  return {
    total: {
      users: totalUsers || 0,
      resumes: totalResumes || 0,
      documents: totalDocuments || 0,
      jobs: totalJobs || 0,
    },
    user: {
      resumes: userResumes || 0,
      documents: userDocuments || 0,
      jobs: userJobs || 0,
    },
    averages: {
      resumesPerUser: avgResumesPerUser,
      documentsPerUser: avgDocumentsPerUser,
      jobsPerUser: avgJobsPerUser,
    }
  };
}

/**
 * Stats API Route
 * 
 * GET /api/stats
 *   - Returns user statistics: total users, resumes, documents, and jobs
 *   - Requires authentication
 */
export async function GET(request: NextRequest) {
  console.log('📊 Stats API - GET request received');
  
  try {
    const userId = await requireAuth();
    console.log('🔐 Stats API - User authenticated:', userId ? '✅' : '❌');

    const stats = await fetchStats(userId);

    console.log('✅ Stats API - Stats fetched successfully');

    return NextResponse.json({ stats });
  } catch (error: any) {
    console.error('❌ Stats API error:', error);
    
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

