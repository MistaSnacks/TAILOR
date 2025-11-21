import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { calculateAtsScore, generateTailoredResumeAtomic, embedText } from '@/lib/gemini';
import { requireAuth } from '@/lib/auth-utils';
import { retrieveProfileForJob } from '@/lib/rag/retriever';
import { selectTargetAwareProfile } from '@/lib/rag/selector';
import { normalizeResumeContent } from '@/lib/resume-content';
import { runResumeCritic } from '@/lib/resume-critic';
import { parseJobDescriptionToContext } from '@/lib/rag/parser';

// 🔑 Environment variable logging (REMOVE IN PRODUCTION)
console.log('⚡ Generate API - Environment check:', {
  supabase: !!supabaseAdmin ? '✅' : '❌',
  gemini: process.env.GEMINI_API_KEY ? '✅' : '❌',
});

export async function POST(request: NextRequest) {
  console.log('⚡ Generate API - POST request received');

  try {
    // Get authenticated user
    const userId = await requireAuth();
    console.log('🔐 Generate API - User authenticated:', userId ? '✅' : '❌');

    const body = await request.json();
    const { jobId, template = 'modern' } = body;

    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      );
    }

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

    // Collect file URIs and parsed content
    const documentFileRefs = documents
      .filter((doc: any) => doc.gemini_file_uri)
      .map((doc: any) => ({
        uri: doc.gemini_file_uri,
        mimeType: doc.file_type || 'application/octet-stream',
      }));

    const parsedDocuments = documents
      .filter((doc: any) => doc.parsed_content?.text)
      .map((doc: any) => doc.parsed_content.text);

    console.log('📄 Using documents:', {
      fileRefs: documentFileRefs.length,
      parsedDocs: parsedDocuments.length,
    });

    const parsedJob = await parseJobDescriptionToContext({
      title: job.title,
      description: job.description,
    });

    const jobDescriptionSeed =
      (job.description || '').trim() ||
      parsedJob.responsibilities.slice(0, 3).join(' ') ||
      parsedJob.normalizedTitle ||
      job.title ||
      'general role';

    const jobEmbedding = await embedText(jobDescriptionSeed.substring(0, 8000));
    const querySeeds = parsedJob.queries.length
      ? parsedJob.queries
      : [jobDescriptionSeed];
    const queryEmbeddings = await Promise.all(
      querySeeds.slice(0, 5).map((query) => embedText(query))
    );

    // Retrieve atomic profile
    const profile = await retrieveProfileForJob(userId, job.description);

    // Select most relevant experiences/bullets for this job
    const selection = selectTargetAwareProfile(
      profile,
      {
        description: job.description,
        title: job.title,
        requiredSkills: job.required_skills || [],
      },
      {
        parsedJob,
        jobEmbedding,
        queryEmbeddings,
      }
    );

    console.log('🎯 Target-aware selection summary:', {
      totalExperiences: selection.diagnostics.totalExperiences,
      eligibleExperiences: selection.diagnostics.eligibleExperiences,
      selectedCount: selection.experiences.length,
      writerExperiencesCount: selection.writerExperiences?.length || 0,
      warnings: selection.diagnostics.warnings.slice(0, 3),
      parsedJobTitle: parsedJob.normalizedTitle,
    });

    if (selection.experiences.length === 0) {
      return NextResponse.json(
        {
          error: 'No eligible experiences passed validation. Please update your resumes to include complete company, title, and date information.',
          diagnostics: selection.diagnostics,
        },
        { status: 400 }
      );
    }

    if (!selection.writerExperiences || selection.writerExperiences.length === 0) {
      console.error('⚠️ No writer experiences available:', {
        selectedExperiences: selection.experiences.length,
        writerExperiences: selection.writerExperiences?.length || 0,
        diagnostics: selection.diagnostics,
      });
      return NextResponse.json(
        {
          error: 'No experiences with bullet candidates available for generation. Please ensure your resumes include detailed achievement bullets.',
          diagnostics: selection.diagnostics,
        },
        { status: 400 }
      );
    }

    const targetedProfile = {
      experiences: selection.writerExperiences,
      topSkills: selection.skills.map((skill) => skill.canonicalName),
      parsedJD: parsedJob,
    };

    // Generate tailored resume (Atomic)
    const rawResumeContent = await generateTailoredResumeAtomic(
      job.description,
      template,
      targetedProfile
    );

    const normalizedDraft = normalizeResumeContent(rawResumeContent);

    let finalResumeContent = normalizedDraft;
    let criticMetadata: any = null;

    try {
      const criticResult = await runResumeCritic({
        resumeDraft: normalizedDraft,
        jobDescription: job.description,
        parsedJob,
      });

      finalResumeContent = criticResult.revisedResume;
      criticMetadata = criticResult.critique;
    } catch (criticError) {
      console.error('❌ Resume critic error:', criticError);
    }

    const storedContent = criticMetadata
      ? {
          ...finalResumeContent,
          critic: criticMetadata,
        }
      : finalResumeContent;

    // Create resume version
    const { data: resumeVersion, error: resumeError } = await supabaseAdmin
      .from('resume_versions')
      .insert({
        user_id: userId,
        job_id: jobId,
        template,
        content: storedContent,
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
        JSON.stringify(storedContent)
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
  } catch (error: any) {
    console.error('❌ Generation error:', error);

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

