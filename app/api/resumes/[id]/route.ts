import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth-utils';
import { normalizeResumeContent } from '@/lib/resume-content';
import { calculateAtsScore } from '@/lib/gemini';

const isDev = process.env.NODE_ENV !== 'production';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (isDev) console.log('📄 Resume Detail API - GET request for resume:', id);

  try {
    const userId = await requireAuth();
    if (isDev) console.log('🔐 Resume Detail API - User authenticated:', userId ? '✅' : '❌');

    const { data: resume, error } = await supabaseAdmin
      .from('resume_versions')
      .select(`
        *,
        job:jobs(*),
        ats_score:ats_scores(*)
      `)
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error || !resume) {
      console.error('Resume not found:', error);
      return NextResponse.json(
        { error: 'Resume not found' },
        { status: 404 }
      );
    }

    const formattedResume = {
      ...resume,
      ats_score: resume.ats_score?.[0] || null,
    };

    return NextResponse.json({ resume: formattedResume });
  } catch (error: any) {
    console.error('❌ Resume detail error:', error);

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

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    console.log('🗑️  Delete API - DELETE request for resume:', id);

    try {
        // Get authenticated user
        const userId = await requireAuth();
        console.log('🔐 Delete API - User authenticated:', userId ? '✅' : '❌');

        // First, verify the resume exists and belongs to the user
        const { data: resume, error: fetchError } = await supabaseAdmin
            .from('resume_versions')
            .select('id, user_id')
            .eq('id', id)
            .eq('user_id', userId)
            .single();

        if (fetchError || !resume) {
            console.error('Resume not found or unauthorized:', fetchError);
            return NextResponse.json(
                { error: 'Resume not found' },
                { status: 404 }
            );
        }

        // Delete the resume
        const { error: deleteError } = await supabaseAdmin
            .from('resume_versions')
            .delete()
            .eq('id', id)
            .eq('user_id', userId);

        if (deleteError) {
            console.error('Error deleting resume:', deleteError);
            return NextResponse.json(
                { error: 'Failed to delete resume' },
                { status: 500 }
            );
        }

        console.log('✅ Resume deleted successfully:', id);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('❌ Delete error:', error);

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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  console.log('✏️ Resume Detail API - PATCH request for resume:', id);

  try {
    const userId = await requireAuth();
    console.log('🔐 Resume Detail API - User authenticated:', userId ? '✅' : '❌');

    const body = await request.json();
    const { content, recalculateAts = true } = body;

    if (!content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    // Ensure resume exists and belongs to user
    const { data: resumeRecord, error: resumeError } = await supabaseAdmin
      .from('resume_versions')
      .select('id, user_id, job:jobs(id, description)')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (resumeError || !resumeRecord) {
      console.error('Resume not found for update:', resumeError);
      return NextResponse.json(
        { error: 'Resume not found' },
        { status: 404 }
      );
    }

    const normalizedContent = normalizeResumeContent(content);

    const { data: updatedResume, error: updateError } = await supabaseAdmin
      .from('resume_versions')
      .update({ content: normalizedContent })
      .eq('id', id)
      .eq('user_id', userId)
      .select(`
        *,
        job:jobs(*),
        ats_score:ats_scores(*)
      `)
      .single();

    if (updateError || !updatedResume) {
      console.error('Error updating resume:', updateError);
      return NextResponse.json(
        { error: 'Failed to update resume' },
        { status: 500 }
      );
    }

    let atsScore = updatedResume.ats_score?.[0] || null;

    if (recalculateAts && resumeRecord.job?.description) {
      try {
        const atsResult = await calculateAtsScore(
          resumeRecord.job.description,
          JSON.stringify(normalizedContent)
        );

        const { data: existingScore } = await supabaseAdmin
          .from('ats_scores')
          .select('id')
          .eq('resume_version_id', id)
          .single();

        if (existingScore) {
          const { data: updatedScore, error: atsUpdateError } = await supabaseAdmin
            .from('ats_scores')
            .update({
              score: atsResult.score,
              keyword_match: atsResult.keywordMatch,
              semantic_similarity: atsResult.semanticSimilarity,
              analysis: atsResult.analysis,
            })
            .eq('id', existingScore.id)
            .select()
            .single();

          if (!atsUpdateError) {
            atsScore = updatedScore;
          }
        } else {
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

          if (!atsInsertError) {
            atsScore = insertedScore;
          }
        }
      } catch (atsError) {
        console.error('❌ ATS recalculation error:', atsError);
      }
    }

    const responseResume = {
      ...updatedResume,
      ats_score: atsScore,
    };

    return NextResponse.json({ resume: responseResume });
  } catch (error: any) {
    console.error('❌ Resume update error:', error);

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
