import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { 
  saveJob, 
  unsaveJob, 
  getSavedJobs,
  markJobApplied,
} from '@/lib/jobs/service';
import type { NormalizedJob } from '@/lib/jobs/types';

// 🔑 Environment variable logging (REMOVE IN PRODUCTION)
console.log('💾 Saved Jobs API loaded');

// GET - List saved jobs
export async function GET(request: NextRequest) {
  console.log('💾 Saved Jobs API - GET request received');
  
  try {
    const userId = await requireAuth();
    console.log('🔐 Saved Jobs API - User authenticated:', userId ? '✅' : '❌');
    
    const savedJobs = await getSavedJobs(userId);
    
    return NextResponse.json({
      jobs: savedJobs,
      count: savedJobs.length,
    });
  } catch (error: any) {
    console.error('❌ Saved Jobs API GET error:', error);
    
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Save a job
export async function POST(request: NextRequest) {
  console.log('💾 Saved Jobs API - POST request received');
  
  try {
    const userId = await requireAuth();
    console.log('🔐 Saved Jobs API - User authenticated:', userId ? '✅' : '❌');
    
    const body = await request.json();
    const { job, notes } = body as { job: NormalizedJob; notes?: string };
    
    if (!job || !job.id) {
      return NextResponse.json({ error: 'Job data is required' }, { status: 400 });
    }
    
    const savedJob = await saveJob(userId, job, notes);
    
    return NextResponse.json({ savedJob });
  } catch (error: any) {
    console.error('❌ Saved Jobs API POST error:', error);
    
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Remove a saved job
export async function DELETE(request: NextRequest) {
  console.log('💾 Saved Jobs API - DELETE request received');
  
  try {
    const userId = await requireAuth();
    console.log('🔐 Saved Jobs API - User authenticated:', userId ? '✅' : '❌');
    
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');
    
    if (!jobId) {
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 });
    }
    
    await unsaveJob(userId, jobId);
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('❌ Saved Jobs API DELETE error:', error);
    
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH - Mark job as applied
export async function PATCH(request: NextRequest) {
  console.log('💾 Saved Jobs API - PATCH request received');
  
  try {
    const userId = await requireAuth();
    console.log('🔐 Saved Jobs API - User authenticated:', userId ? '✅' : '❌');
    
    const body = await request.json();
    const { jobId, applied } = body as { jobId: string; applied: boolean };
    
    if (!jobId) {
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 });
    }
    
    if (applied) {
      await markJobApplied(userId, jobId);
    }
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('❌ Saved Jobs API PATCH error:', error);
    
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}



