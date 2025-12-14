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
import { runQualityPass, USE_MERGED_PASS, type QualityPassMetadata } from '@/lib/resume-quality-pass';
import { parseJobDescriptionToContext } from '@/lib/rag/parser';

const isDev = process.env.NODE_ENV !== 'production';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  if (isDev) console.log('⚡ Generate API - POST request received');

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

    console.log('📋 [1/8] Fetching job details...');
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
    console.log('✅ [1/8] Job details fetched:', { jobTitle: job.title, company: job.company });

    console.log('📄 [2/8] Fetching user documents...');
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
    console.log('✅ [2/8] Documents fetched:', { count: documents.length });

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

    // ⚡ OPTIMIZATION: Check for cached parsed job context first
    console.log('🔍 [3/8] Parsing job description...');
    console.log('🧮 [4/8] Generating embeddings (parallel with parsing)...');

    // Primary seed can be computed immediately without waiting for parsedJob
    // We avoid defaulting to 'general role' here so we can fall back to parsed job data later.
    const primarySeed =
      (job.description || '').trim() || (job.title || '').trim() || '';
    const embedSeed = primarySeed || 'general role';

    const parseStartTime = Date.now();

    // Check if we have a cached parsed job context
    const hasCachedParsedJob = job.parsed_job_context &&
      typeof job.parsed_job_context === 'object' &&
      job.parsed_job_context.normalizedTitle;

    let parsedJob: Awaited<ReturnType<typeof parseJobDescriptionToContext>>;
    let initialJobEmbedding: number[];

    if (hasCachedParsedJob) {
      // ⚡ CACHE HIT: Skip Gemini parsing call entirely (saves ~8-20s)
      console.log('⚡ [3/8] Using cached parsed job context (NO $ - skipped Gemini call)');
      parsedJob = job.parsed_job_context as typeof parsedJob;
      initialJobEmbedding = await embedText(embedSeed.substring(0, 8000));
    } else {
      // CACHE MISS: Parse job and cache result in parallel with embedding
      const [freshParsedJob, embedding] = await Promise.all([
        parseJobDescriptionToContext({
          title: job.title,
          description: job.description,
        }),
        embedText(embedSeed.substring(0, 8000)),
      ]);

      parsedJob = freshParsedJob;
      initialJobEmbedding = embedding;

      // 🔄 Cache the parsed job context for future regenerations (fire-and-forget)
      supabaseAdmin
        .from('jobs')
        .update({ parsed_job_context: parsedJob })
        .eq('id', jobId)
        .then(({ error }: { error: any }) => {
          if (error) {
            console.error('⚠️ Failed to cache parsed job context:', error.message);
          } else {
            console.log('✅ (NO $) Cached parsed job context for job:', jobId);
          }
        });
    }

    const parallelTime = ((Date.now() - parseStartTime) / 1000).toFixed(1);
    console.log(`✅ [3/8] Job description parsed (${parallelTime}s${hasCachedParsedJob ? ' - CACHED' : ' - fresh'}):`, {
      normalizedTitle: parsedJob.normalizedTitle,
      hardSkills: parsedJob.hardSkills?.length || 0,
    });

    // Final jobDescriptionSeed (may use parsedJob fallbacks if primary was empty)
    const jobDescriptionSeed =
      primarySeed ||
      parsedJob.responsibilities.slice(0, 3).join(' ') ||
      parsedJob.normalizedTitle ||
      'general role';

    let jobEmbedding = initialJobEmbedding;

    // If primary seed was empty and we fell back to richer parsed context, recompute embedding to align
    if (!primarySeed && jobDescriptionSeed !== 'general role') {
      jobEmbedding = await embedText(jobDescriptionSeed.substring(0, 8000));
    }

    // Query seeds depend on parsedJob, so these must run after parsing completes
    const querySeeds = parsedJob.queries.length
      ? parsedJob.queries
      : [jobDescriptionSeed];

    // ⚡ PARALLEL OPTIMIZATION: Run query embeddings and profile retrieval concurrently
    console.log('🧮 [4/8] Generating query embeddings...');
    console.log('👤 [5/8] Retrieving profile (parallel with embeddings)...');

    const embedProfileStartTime = Date.now();

    const [queryEmbeddings, profile] = await Promise.all([
      // Generate query embeddings in parallel batch
      Promise.all(querySeeds.slice(0, 5).map((query) => embedText(query))),
      // Retrieve atomic profile concurrently
      retrieveProfileForJob(userId, job.description),
    ]);

    const embedProfileTime = ((Date.now() - embedProfileStartTime) / 1000).toFixed(1);
    console.log(`✅ [4/8] Embeddings generated (${embedProfileTime}s parallel):`, {
      jobEmbedding: !!jobEmbedding,
      queryEmbeddings: queryEmbeddings.length,
    });

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

    console.log('✅ [5/8] Profile retrieved and experiences selected (profile fetched in parallel):', {
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
      sources: {
        requiredSkills: Array.isArray(job.required_skills) ? job.required_skills.length : 0,
        parsedHardSkills: parsedJob?.hardSkills?.length || 0,
        parsedSoftSkills: parsedJob?.softSkills?.length || 0,
        parsedKeyPhrases: parsedJob?.keyPhrases?.length || 0,
      },
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

    const selectionTrace = {
      inferenceSignals,
      diagnostics: selection.diagnostics,
      jobKeywordSample: jobKeywordUniverse.slice(0, 15),
      experiences: selection.experiences.map((entry) => {
        const sampleSize = Math.min(Math.max(entry.bulletBudget * 2, entry.bulletBudget + 2), 10);
        const mapBullet = (bullet: typeof entry.selectedBullets[number]) => ({
          id: bullet.id,
          text: bullet.text,
          score: Number(bullet.score.toFixed(3)),
          similarity: Number(bullet.similarity.toFixed(3)),
          hasMetric: bullet.hasMetric,
          toolMatches: bullet.toolMatches,
          scoreBreakdown: bullet.scoreBreakdown,
          sourceIds: bullet.sourceIds,
        });

        return {
          experienceId: entry.id,
          company: entry.experience.company,
          title: entry.experience.title,
          bulletBudget: entry.bulletBudget,
          alignmentEligible: entry.alignmentEligible,
          alignmentReasons: entry.alignmentReasons,
          signals: entry.signals,
          selectedBullets: entry.selectedBullets.map(mapBullet),
          candidateSample: entry.bulletCandidates.slice(0, sampleSize).map(mapBullet),
        };
      }),
    };

    console.log('(NO $) 🔎 [Selection Trace] Bullet rationale snapshot (first experience only):', {
      label: '[Selection Trace] Bullet rationale snapshot',
      lookFor: 'selectedBullets.scoreBreakdown',
      firstExperience: selectionTrace.experiences[0]?.title || 'n/a',
      company: selectionTrace.experiences[0]?.company || 'n/a',
      selectedBullets: selectionTrace.experiences[0]?.selectedBullets || [],
      inferenceHighlights: inferenceSignals.experienceHighlights.slice(0, 3),
      metricSignals: inferenceSignals.metricSignals.slice(0, 3),
    });

    console.log('✍️ [6/8] Generating tailored resume with AI...');
    // Generate tailored resume (Atomic)
    const rawResumeContent = await generateTailoredResumeAtomic(
      job.description,
      template,
      targetedProfile
    );
    console.log('✅ [6/8] Resume draft generated');

    // Debug: Log what Gemini returned to trace normalization issues
    const rawParsed = typeof rawResumeContent === 'string' ? JSON.parse(rawResumeContent) : rawResumeContent;
    console.log('🔬 [DEBUG] Raw Gemini output structure:', {
      hasExperience: !!rawParsed?.experience,
      experienceCount: rawParsed?.experience?.length || 0,
      firstExpFields: rawParsed?.experience?.[0] ? Object.keys(rawParsed.experience[0]) : [],
      firstExpTitle: rawParsed?.experience?.[0]?.title || 'MISSING',
      firstExpStartDate: rawParsed?.experience?.[0]?.startDate || 'MISSING',
    });

    const normalizedDraft = normalizeResumeContent(rawResumeContent);

    // Ensure contact info (including LinkedIn/portfolio) is preserved from the user's profile
    if (targetedProfile.contactInfo) {
      const contact = normalizedDraft.contact || {};
      normalizedDraft.contact = {
        name: contact.name || targetedProfile.contactInfo.name,
        email: contact.email || targetedProfile.contactInfo.email,
        phone: contact.phone || targetedProfile.contactInfo.phone,
        linkedin: contact.linkedin || targetedProfile.contactInfo.linkedin,
        portfolio: contact.portfolio || targetedProfile.contactInfo.portfolio,
      };
      console.log('(NO $) 📇 Applied profile contact info to draft (REMOVE IN PRODUCTION):', {
        name: normalizedDraft.contact.name ? '✅' : '❌',
        email: normalizedDraft.contact.email ? '✅' : '❌',
        phone: normalizedDraft.contact.phone ? '✅' : '❌',
        linkedin: normalizedDraft.contact.linkedin ? '✅' : '❌',
        portfolio: normalizedDraft.contact.portfolio ? '✅' : '❌',
      });
    }

    // Debug: Log what normalization produced
    console.log('🔬 [DEBUG] After normalizeResumeContent:', {
      experienceCount: normalizedDraft?.experience?.length || 0,
      bulletCount: normalizedDraft?.experience?.reduce((sum, exp) => sum + (exp.bullets?.length || 0), 0) || 0,
      hasSkills: (normalizedDraft?.skills?.length || 0) > 0,
      hasSummary: !!normalizedDraft?.summary,
    });

    // Note: We skip removeGhostData before quality pass to avoid removing legitimate content
    // The quality pass will handle placeholder removal in its prompt
    // We only clean once at the very end after all processing
    let finalResumeContent = normalizedDraft;
    let qualityMetadata: QualityPassMetadata | null = null;
    let criticMetadata: any = null;
    let validatorMetadata: ValidatorMetadata | null = null;

    console.log('🔍 [7/8] Running quality checks and refinements...');

    if (USE_MERGED_PASS) {
      // ⚡ OPTIMIZATION: Single merged quality pass (saves ~15-45s)
      try {
        const qualityStartTime = Date.now();

        // Build per-experience bullet budgets from selection
        const bulletBudgets = new Map<number, number>();
        const experienceRoleTypes = new Map<number, 'primary' | 'context'>();

        selection.writerExperiences?.forEach((exp, idx) => {
          bulletBudgets.set(idx, exp.bullet_budget || 6);
          // Classify as primary if alignment score > 0.6 (score is on the experience itself)
          const alignmentScore = (exp as any).alignment_score ?? (exp as any).relevanceScore ?? 0.5;
          experienceRoleTypes.set(idx, alignmentScore > 0.6 ? 'primary' : 'context');
        });

        console.log('📊 [BULLET BUDGETS] Per-experience allocations:', {
          budgets: Object.fromEntries(bulletBudgets),
          roleTypes: Object.fromEntries(experienceRoleTypes),
        });

        const qualityResult = await runQualityPass({
          resumeDraft: finalResumeContent,
          jobDescription: job.description,
          parsedJob,
          jobKeywords: jobKeywordUniverse,
          candidateSkillUniverse,
          maxBulletsPerExperience: 6,
          keywordInjectionLimit: 12,
          bulletBudgets,
          experienceRoleTypes,
        });

        finalResumeContent = qualityResult.refinedResume;
        qualityMetadata = qualityResult.metadata;

        const qualityTime = ((Date.now() - qualityStartTime) / 1000).toFixed(1);
        console.log(`✅ Merged quality pass completed (${qualityTime}s):`, {
          aiChanges: qualityMetadata.aiChanges.length,
          bulletsRewritten: qualityMetadata.bulletsRewritten,
          summaryChanged: qualityMetadata.summaryChanged,
          skillsChanged: qualityMetadata.skillsChanged,
          jdKeywordsAdded: qualityMetadata.jdKeywordsAdded.length,
        });
      } catch (qualityError) {
        console.error('❌ Quality pass error:', qualityError);
        // Fall back to separate passes
        console.log('⚠️ Falling back to separate Critic + Validator passes...');
      }
    }

    // Fallback: Run separate passes if merged pass failed or disabled
    if (!qualityMetadata) {
      // Step 1: Run critic to improve bullet quality and structure
      try {
        const criticResult = await runResumeCritic({
          resumeDraft: finalResumeContent,
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
      }
    }

    console.log('✅ [7/8] Quality checks completed');

    // Final pass: remove any remaining ghost data after all processing
    const finalCleanedContent = removeGhostData(finalResumeContent);

    const storedContent: any = {
      ...finalCleanedContent,
      selectionTrace,
    };

    // Store quality pass metadata (includes AI changes for UI display)
    if (qualityMetadata) {
      storedContent.qualityPass = {
        aiChanges: qualityMetadata.aiChanges,
        score: qualityMetadata.score,
        summaryChanged: qualityMetadata.summaryChanged,
        skillsChanged: qualityMetadata.skillsChanged,
        bulletsRewritten: qualityMetadata.bulletsRewritten,
        jdKeywordsAdded: qualityMetadata.jdKeywordsAdded,
      };
    }

    // Store critic metadata if available (fallback path)
    if (criticMetadata) {
      storedContent.critic = criticMetadata;
    }

    // Store validator metadata if available (fallback path)
    if (validatorMetadata) {
      storedContent.validator = validatorMetadata;
    }

    console.log('💾 [8/8] Saving resume...');
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
    console.log('✅ Resume saved:', { resumeId: resumeVersion.id });

    // 🚀 ATS scoring is synchronous to avoid serverless freeze/terminate (Vercel)
    // If this becomes slow, move to a durable queue (SQS/KV+cron) or edge waitUntil.
    const atsStartTime = Date.now();
    let atsResult: Awaited<ReturnType<typeof calculateAtsScore>> | null = null;
    try {
      console.log('📊 (IS $) Starting ATS scoring (synchronous) for resume:', resumeVersion.id);
      const { formatResumeForAts } = await import('@/lib/resume-content');
      const resumeTextForAts = formatResumeForAts(finalCleanedContent);

      atsResult = await calculateAtsScore(
        job.description,
        resumeTextForAts
      );

      const { error: atsInsertError } = await supabaseAdmin.from('ats_scores').insert({
        resume_version_id: resumeVersion.id,
        score: atsResult.score,
        keyword_match: atsResult.keywordMatch,
        semantic_similarity: atsResult.semanticSimilarity,
        analysis: atsResult.analysis,
      });

      if (atsInsertError) {
        console.error('❌ (IS $) ATS score insert error:', atsInsertError);
      } else {
        console.log(`✅ (IS $) ATS score saved: ${atsResult.score}% in ${Date.now() - atsStartTime}ms`);
      }
    } catch (atsError: any) {
      console.error('❌ (IS $) ATS scoring error:', atsError?.message);
    }

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`✅ [8/8] Generation complete! Total time: ${totalTime}s (ATS scoring synchronous)`);
    console.log('🎉 Resume generation finished successfully');

    return NextResponse.json({
      resumeVersion,
      atsScorePending: !atsResult,
      atsScore: atsResult?.score ?? null,
    });
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

