import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { calculateAtsScore } from '@/lib/gemini';
import { requireAuth } from '@/lib/auth-utils';
import { formatResumeForAts } from '@/lib/resume-content';

/**
 * POST /api/resumes/[id]/ats-score
 * Triggers ATS scoring for a resume (background job endpoint)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  const { id } = await params;

  console.log('📊 (IS $)[ATS-Score API] Starting ATS calculation for resume:', id);

  try {
    const userId = await requireAuth();

    // Fetch resume with job description
    const { data: resume, error: resumeError } = await supabaseAdmin
      .from('resume_versions')
      .select('*, job:jobs(*)')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (resumeError || !resume) {
      console.error('❌ Resume not found:', resumeError);
      return NextResponse.json({ error: 'Resume not found' }, { status: 404 });
    }

    if (!resume.job?.description) {
      console.error('❌ No job description for ATS scoring');
      return NextResponse.json({ error: 'No job description available' }, { status: 400 });
    }

    // Check if ATS score already exists
    const { data: existingScore } = await supabaseAdmin
      .from('ats_scores')
      .select('id, score')
      .eq('resume_version_id', id)
      .single();

    if (existingScore) {
      console.log('✅ (NO $) ATS score already exists:', { score: existingScore.score });
      return NextResponse.json({ 
        atsScore: existingScore,
        cached: true,
        ms: Date.now() - startTime
      });
    }

    // Calculate ATS score
    const resumeTextForAts = formatResumeForAts(resume.content);
    
    console.log('🔄 (IS $)[ATS-Score API] Calling Gemini for ATS analysis...');
    const atsResult = await calculateAtsScore(
      resume.job.description,
      resumeTextForAts
    );

    console.log('✅ (IS $)[ATS-Score API] ATS score calculated:', {
      score: atsResult.score,
      ms: Date.now() - startTime
    });

    // Insert ATS score
    const { data: insertedScore, error: atsInsertError } = await supabaseAdmin
      .from('ats_scores')
      .insert({
        resume_version_id: id,
        score: atsResult.score,
        keyword_match: atsResult.keywordMatch,
        semantic_similarity: atsResult.semanticSimilarity,
        analysis: atsResult.analysis,
      })
      .select()
      .single();

    if (atsInsertError) {
      console.error('❌ ATS score insert error:', atsInsertError);
      return NextResponse.json({ error: 'Failed to save ATS score' }, { status: 500 });
    }

    const totalMs = Date.now() - startTime;
    console.log(`✅ (IS $)[ATS-Score API] Complete in ${totalMs}ms`);

    return NextResponse.json({ 
      atsScore: insertedScore,
      cached: false,
      ms: totalMs
    });
  } catch (error: any) {
    console.error('❌ ATS scoring error:', error);
    return NextResponse.json(
      { error: error.message || 'ATS scoring failed' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/resumes/[id]/ats-score
 * Check if ATS score exists (for polling)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const userId = await requireAuth();

    // Verify ownership
    const { data: resume, error: resumeError } = await supabaseAdmin
      .from('resume_versions')
      .select('id')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (resumeError || !resume) {
      return NextResponse.json({ error: 'Resume not found' }, { status: 404 });
    }

    // Check for existing score
    const { data: atsScore } = await supabaseAdmin
      .from('ats_scores')
      .select('*')
      .eq('resume_version_id', id)
      .single();

    return NextResponse.json({ 
      atsScore: atsScore || null,
      pending: !atsScore
    });
  } catch (error: any) {
    console.error('❌ ATS score check error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check ATS score' },
      { status: 500 }
    );
  }
}


