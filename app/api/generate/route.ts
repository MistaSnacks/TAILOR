import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { calculateAtsScore, generateTailoredResumeAtomic, embedText } from '@/lib/gemini';
import { requireAuth } from '@/lib/auth-utils';
import { retrieveProfileForJob } from '@/lib/rag/retriever';
import type { RetrievedProfile } from '@/lib/rag/retriever';
import { selectTargetAwareProfile } from '@/lib/rag/selector';
import { normalizeResumeContent, removeGhostData } from '@/lib/resume-content';
import { runResumeCritic } from '@/lib/resume-critic';
import { validateAndRefineResume, type ValidatorMetadata } from '@/lib/resume-validator';
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

    // Support both sanitizedText (current) and text (legacy) keys
    const parsedDocuments = documents
      .filter((doc: any) => doc.parsed_content?.sanitizedText || doc.parsed_content?.text)
      .map((doc: any) => doc.parsed_content.sanitizedText || doc.parsed_content.text);

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
    const inferenceSignals = buildInferenceSignals(profile);

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
      education: (profile.education || []).map(edu => ({
        institution: edu.institution,
        degree: edu.degree,
        field: edu.fieldOfStudy,
        startDate: edu.startDate,
        endDate: edu.endDate,
        graduationDate: edu.endDate, // Use endDate as graduation date if available
      })),
      certifications: (profile.certifications || []).map(cert => ({
        name: cert.name,
        issuer: cert.issuer,
        date: cert.issueDate,
      })),
      // Only include contact info fields that have values (optional fields)
      contactInfo: profile.contactInfo ? {
        name: profile.contactInfo.name || undefined,
        email: profile.contactInfo.email || undefined,
        phone: profile.contactInfo.phone || undefined,
        linkedin: profile.contactInfo.linkedin || undefined,
        portfolio: profile.contactInfo.portfolio || undefined,
        // Note: address is intentionally excluded - never include in resume
      } : undefined,
      canonicalSkillPool: inferenceSignals.skillUniverse,
      inferenceContext: {
        experienceHighlights: inferenceSignals.experienceHighlights,
        metricSignals: inferenceSignals.metricSignals,
        instructions: 'Use these canonical highlights when inferring new ATS-aligned bullets. Only add content when it is logically implied by the supplied highlights or metric signals, and reference the supporting highlight in the bullet text.',
      },
    };

    const jobKeywordUniverse = Array.from(
      new Set(
        [
          ...(Array.isArray(job.required_skills) ? job.required_skills : []),
          ...(parsedJob?.hardSkills || []),
          ...(parsedJob?.softSkills || []),
          ...(parsedJob?.keyPhrases || []),
        ]
          .map((keyword) => (typeof keyword === 'string' ? keyword.trim() : ''))
          .filter((keyword) => keyword.length > 0)
      )
    );

    console.log('🧠 JD keyword universe prepared:', {
      totalKeywords: jobKeywordUniverse.length,
      sample: jobKeywordUniverse.slice(0, 8),
    });

    const candidateSkillUniverse = Array.from(
      new Set(
        [
          ...(targetedProfile.canonicalSkillPool || []),
          ...(targetedProfile.topSkills || []),
          ...((selection.skills || []).map((skill) => skill.canonicalName)),
        ]
          .map((skill) => (typeof skill === 'string' ? skill.trim() : ''))
          .filter((skill) => skill.length > 0)
      )
    );

    console.log('🧾 Candidate canonical skill universe prepared:', {
      totalSkills: candidateSkillUniverse.length,
      sample: candidateSkillUniverse.slice(0, 10),
    });

    // Generate tailored resume (Atomic)
    const rawResumeContent = await generateTailoredResumeAtomic(
      job.description,
      template,
      targetedProfile
    );

    const normalizedDraft = normalizeResumeContent(rawResumeContent);

    // Remove any ghost/placeholder data before critic
    const cleanedDraft = removeGhostData(normalizedDraft);

    let finalResumeContent = cleanedDraft;
    let criticMetadata: any = null;
    let validatorMetadata: ValidatorMetadata | null = null;

    // Step 1: Run critic to improve bullet quality and structure
    try {
      const criticResult = await runResumeCritic({
        resumeDraft: cleanedDraft,
        jobDescription: job.description,
        parsedJob,
      });

      finalResumeContent = criticResult.revisedResume;
      criticMetadata = criticResult.critique;
      console.log('✅ Critic pass completed:', {
        issuesFound: criticMetadata?.issues?.length || 0,
        overallScore: criticMetadata?.score?.overall || 0,
      });
    } catch (criticError) {
      console.error('❌ Resume critic error:', criticError);
    }

    // Step 2: Run validator micro-agent for final JD alignment pass
    try {
      const validatorResult = await validateAndRefineResume({
        resumeDraft: finalResumeContent,
        jobDescription: job.description,
        parsedJob,
        jobKeywords: jobKeywordUniverse,
        candidateSkillUniverse,
        keywordInjectionLimit: 12,
      });

      finalResumeContent = validatorResult.refinedResume;
      validatorMetadata = validatorResult.metadata;
      console.log('✅ Validator pass completed:', {
        changesCount: validatorMetadata.changes.length,
        summaryChanged: validatorMetadata.summaryChanged,
        skillsChanged: validatorMetadata.skillsChanged,
        jdKeywordsAdded: validatorMetadata.jdKeywordsAdded.length,
      });
    } catch (validatorError) {
      console.error('❌ Resume validator error:', validatorError);
      // Continue with critic output if validator fails
    }

    // Final pass: remove any remaining ghost data after all processing
    const finalCleanedContent = removeGhostData(finalResumeContent);

    const storedContent: any = {
      ...finalCleanedContent,
    };

    // Store critic metadata if available
    if (criticMetadata) {
      storedContent.critic = criticMetadata;
    }

    // Store validator metadata if available
    if (validatorMetadata) {
      storedContent.validator = validatorMetadata;
    }

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
      console.log('📊 Calculating ATS score...');
      // Format resume content for ATS scoring (exclude metadata)
      const { formatResumeForAts } = await import('@/lib/resume-content');
      const resumeTextForAts = formatResumeForAts(finalCleanedContent);
      
      const atsResult = await calculateAtsScore(
        job.description,
        resumeTextForAts
      );

      console.log('✅ ATS score calculated:', {
        score: atsResult.score,
        keywordMatch: atsResult.keywordMatch,
        semanticSimilarity: atsResult.semanticSimilarity,
      });

      const { error: atsInsertError } = await supabaseAdmin.from('ats_scores').insert({
        resume_version_id: resumeVersion.id,
        score: atsResult.score,
        keyword_match: atsResult.keywordMatch,
        semantic_similarity: atsResult.semanticSimilarity,
        analysis: atsResult.analysis,
      });

      if (atsInsertError) {
        console.error('❌ ATS score insert error:', atsInsertError);
      } else {
        console.log('✅ ATS score saved to database');
      }
    } catch (atsError: any) {
      console.error('❌ ATS scoring error:', atsError);
      console.error('ATS error details:', {
        message: atsError?.message,
        stack: atsError?.stack?.split('\n').slice(0, 3),
      });
      // Don't fail the request if ATS scoring fails
    }

    return NextResponse.json({ resumeVersion });
  } catch (error: any) {
    console.error('❌ Generation error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack?.split('\n').slice(0, 5),
    });

    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Return more specific error message for debugging
    const errorMessage = error.message || 'Internal server error';
    return NextResponse.json(
      {
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error.stack?.split('\n')[0] : undefined,
      },
      { status: 500 }
    );
  }
}

const MAX_INFERENCE_HIGHLIGHTS = 12;

function buildInferenceSignals(profile: RetrievedProfile) {
  const experienceHighlights = profile.experiences
    .map((experience) => {
      const bulletSnippets = (experience.bullets || [])
        .map((bullet) => bullet.text)
        .filter(Boolean)
        .slice(0, 2);

      const range = formatExperienceRange(
        experience.startDate,
        experience.endDate,
        experience.isCurrent
      );

      if (bulletSnippets.length === 0) {
        return `${experience.title} @ ${experience.company} (${range})`;
      }

      return `${experience.title} @ ${experience.company} (${range}) — ${bulletSnippets.join(' || ')}`;
    })
    .filter(Boolean)
    .slice(0, MAX_INFERENCE_HIGHLIGHTS);

  const metricSignals = profile.experiences
    .flatMap((experience) =>
      (experience.bullets || [])
        .filter((bullet) => /\d/.test(bullet.text || '') || /%/.test(bullet.text || ''))
        .map((bullet) => `${experience.company}: ${bullet.text}`)
    )
    .filter(Boolean)
    .slice(0, MAX_INFERENCE_HIGHLIGHTS);

  const skillUniverse = profile.skills.map((skill) => skill.canonicalName);

  return {
    experienceHighlights,
    metricSignals,
    skillUniverse,
  };
}

function formatExperienceRange(
  start?: string | null,
  end?: string | null,
  isCurrent?: boolean
) {
  const startLabel = start || 'n/a';
  if (isCurrent || !end) {
    return `${startLabel} - Present`;
  }
  return `${startLabel} - ${end}`;
}

