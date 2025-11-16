import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { generateTailoredResume, calculateAtsScore } from '@/lib/gemini';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { jobId, template = 'modern' } = body;

    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      );
    }

    const userId = 'placeholder-user-id';

    // Fetch job details
    const { data: job, error: jobError } = await supabaseAdmin
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .eq('user_id', userId)
      .single();

    if (jobError || !job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    // Fetch user documents
    const { data: documents, error: docsError } = await supabaseAdmin
      .from('documents')
      .select('*')
      .eq('user_id', userId)
      .eq('parse_status', 'completed');

    if (docsError) {
      console.error('Documents fetch error:', docsError);
      return NextResponse.json(
        { error: 'Failed to fetch documents' },
        { status: 500 }
      );
    }

    if (!documents || documents.length === 0) {
      return NextResponse.json(
        { error: 'No documents found. Please upload your resume first.' },
        { status: 400 }
      );
    }

    // Collect file URIs for Gemini
    const fileUris = documents
      .filter((doc: any) => doc.gemini_file_uri)
      .map((doc: any) => doc.gemini_file_uri);

    // Generate tailored resume
    const resumeContent = await generateTailoredResume(
      job.description,
      fileUris,
      template
    );

    // Parse the generated content (expecting JSON)
    let parsedContent;
    try {
      const jsonMatch = resumeContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedContent = JSON.parse(jsonMatch[0]);
      } else {
        parsedContent = { raw: resumeContent };
      }
    } catch (parseError) {
      parsedContent = { raw: resumeContent };
    }

    // Create resume version
    const { data: resumeVersion, error: resumeError } = await supabaseAdmin
      .from('resume_versions')
      .insert({
        user_id: userId,
        job_id: jobId,
        template,
        content: parsedContent,
      })
      .select()
      .single();

    if (resumeError) {
      console.error('Resume creation error:', resumeError);
      return NextResponse.json(
        { error: 'Failed to create resume version' },
        { status: 500 }
      );
    }

    // Calculate ATS score in background
    try {
      const atsResult = await calculateAtsScore(
        job.description,
        JSON.stringify(parsedContent)
      );

      await supabaseAdmin.from('ats_scores').insert({
        resume_version_id: resumeVersion.id,
        score: atsResult.score,
        keyword_match: atsResult.keywordMatch,
        semantic_similarity: atsResult.semanticSimilarity,
        analysis: atsResult.analysis,
      });
    } catch (atsError) {
      console.error('ATS scoring error:', atsError);
      // Don't fail the request if ATS scoring fails
    }

    return NextResponse.json({ resumeVersion });
  } catch (error) {
    console.error('Generation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

