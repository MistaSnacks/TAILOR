import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth, getAuthUser } from '@/lib/auth-utils';
import { isAdminEmail } from '@/lib/config/admin';

/**
 * User Activity API Route
 * 
 * GET /api/users/activity
 *   - Returns all users with their activity counts (resumes, documents, jobs)
 *   - Requires authentication
 *   - Restricted to admin users
 */
export async function GET(request: NextRequest) {
  console.log('📊 User Activity API - GET request received');
  
  try {
    const userId = await requireAuth();
    console.log('🔐 User Activity API - User authenticated:', userId ? '✅' : '❌');

    // Check if user is admin
    const authUser = await getAuthUser();
    if (!authUser?.email || !isAdminEmail(authUser.email)) {
      console.log('❌ User Activity API - Access denied for:', authUser?.email || 'unknown');
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    // Get all users
    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id, email, name, created_at')
      .order('created_at', { ascending: false });

    if (usersError || !users) {
      console.error('❌ Error fetching users:', usersError);
      return NextResponse.json(
        { error: 'Failed to fetch users' },
        { status: 500 }
      );
    }

    // Get all activity data
    const [
      { data: allResumes },
      { data: allDocuments },
      { data: allJobs }
    ] = await Promise.all([
      supabaseAdmin.from('resume_versions').select('user_id'),
      supabaseAdmin.from('documents').select('user_id'),
      supabaseAdmin.from('jobs').select('user_id')
    ]);

    // Count per user
    const resumeCounts: Record<string, number> = {};
    const documentCounts: Record<string, number> = {};
    const jobCounts: Record<string, number> = {};

    allResumes?.forEach((row: any) => {
      resumeCounts[row.user_id] = (resumeCounts[row.user_id] || 0) + 1;
    });

    allDocuments?.forEach((row: any) => {
      documentCounts[row.user_id] = (documentCounts[row.user_id] || 0) + 1;
    });

    allJobs?.forEach((row: any) => {
      jobCounts[row.user_id] = (jobCounts[row.user_id] || 0) + 1;
    });

    // Combine users with their activity counts
    const usersWithActivity = users.map((user: any) => ({
      id: user.id,
      email: user.email || 'No email',
      name: user.name || 'No name',
      created_at: user.created_at,
      activity: {
        resumes: resumeCounts[user.id] || 0,
        documents: documentCounts[user.id] || 0,
        jobs: jobCounts[user.id] || 0,
        total: (resumeCounts[user.id] || 0) + (documentCounts[user.id] || 0) + (jobCounts[user.id] || 0)
      }
    }));

    // Sort by total activity (descending)
    usersWithActivity.sort((a: any, b: any) => b.activity.total - a.activity.total);

    console.log('✅ User Activity API - Data fetched successfully');

    return NextResponse.json({ users: usersWithActivity });
  } catch (error: any) {
    console.error('❌ User Activity API error:', error);
    
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

