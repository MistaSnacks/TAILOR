import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function main() {
  const resumeVersionId = process.argv[2];

  if (!resumeVersionId) {
    console.error('Usage: npx tsx scripts/show-selection-trace.ts <resumeVersionId>');
    process.exit(1);
  }

  const supabaseUrlSet = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKeySet = !!process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log('(NO $) 🔑 Env check for selection trace (REMOVE IN PRODUCTION):', {
    supabaseUrl: supabaseUrlSet ? '✅ Set' : '❌ Missing',
    supabaseServiceRole: supabaseServiceKeySet ? '✅ Set' : '❌ Missing',
  });

  if (!supabaseUrlSet || !supabaseServiceKeySet) {
    console.error('Supabase environment variables are required to fetch resume versions.');
    process.exit(1);
  }

  const { supabaseAdmin } = await import('@/lib/supabase');

  console.log('(IS $) 🔎 Fetching resume version for selection trace...', {
    resumeVersionId,
    lookFor: 'content.selectionTrace',
  });

  const { data, error } = await supabaseAdmin
    .from('resume_versions')
    .select('id, job_id, created_at, content')
    .eq('id', resumeVersionId)
    .single();

  if (error || !data) {
    console.error('Failed to load resume version:', error || 'Not found');
    process.exit(1);
  }

  const trace = (data as any).content?.selectionTrace;

  if (!trace) {
    console.error('No selectionTrace stored on this resume version.');
    process.exit(1);
  }

  const firstExperience = trace.experiences?.[0];

  console.log('(NO $) [TRACE] Selection summary:', {
    resumeVersionId: data.id,
    jobId: (data as any).job_id,
    createdAt: data.created_at,
    experienceCount: trace.experiences?.length || 0,
    inferenceHighlights: trace.inferenceSignals?.experienceHighlights?.slice(0, 5) || [],
    metricSignals: trace.inferenceSignals?.metricSignals?.slice(0, 5) || [],
    jobKeywordSample: trace.jobKeywordSample || [],
  });

  console.log('(NO $) [TRACE] Bullet rationale per experience (top-level):', {
    experiences: (trace.experiences || []).map((exp: any) => ({
      experienceId: exp.experienceId,
      company: exp.company,
      title: exp.title,
      bulletBudget: exp.bulletBudget,
      alignmentEligible: exp.alignmentEligible,
      alignmentReasons: exp.alignmentReasons,
      selectedBullets: (exp.selectedBullets || []).map((bullet: any) => ({
        id: bullet.id,
        scoreBreakdown: bullet.scoreBreakdown,
        hasMetric: bullet.hasMetric,
        toolMatches: bullet.toolMatches,
      })),
    })),
  });

  if (firstExperience) {
    console.log('(NO $) [TRACE] First experience bullet rationale details:', {
      label: '[TRACE] First experience bullet rationale details',
      experience: {
        company: firstExperience.company,
        title: firstExperience.title,
        bulletBudget: firstExperience.bulletBudget,
      },
      selectedBullets: (firstExperience.selectedBullets || []).map((bullet: any) => ({
        id: bullet.id,
        text: bullet.text,
        scoreBreakdown: bullet.scoreBreakdown,
        hasMetric: bullet.hasMetric,
        toolMatches: bullet.toolMatches,
      })),
      candidateSample: (firstExperience.candidateSample || []).map((bullet: any) => ({
        id: bullet.id,
        scoreBreakdown: bullet.scoreBreakdown,
        text: bullet.text,
      })),
    });
  } else {
    console.log('(NO $) [TRACE] No experiences found in selection trace.');
  }
}

main().catch((error) => {
  console.error('Script error:', error);
  process.exit(1);
});


