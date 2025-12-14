import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth-utils';
import { embedText } from '@/lib/gemini';

const isDev = process.env.NODE_ENV !== 'production';

// Environment check (dev only)
if (isDev && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not set in profile enrichment route');
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type EnrichmentRequest = {
  canonicalExperienceId: string;
  promotedBullet: {
    text: string;
    sourceIds: string[];
    mergedFrom?: string[];
  };
};

/**
 * POST /api/profile/enrich
 * 
 * Allows users to promote a merged bullet from a generated resume back into
 * their canonical profile with full provenance tracking.
 * 
 * This enables the canonical profile to grow richer over time as users
 * approve high-quality merged bullets from the generation process.
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await requireAuth();

    const body: EnrichmentRequest = await request.json();
    const { canonicalExperienceId, promotedBullet } = body;

    if (!canonicalExperienceId || !promotedBullet?.text) {
      return NextResponse.json(
        { error: 'Missing required fields: canonicalExperienceId, promotedBullet.text' },
        { status: 400 }
      );
    }

    // Verify the canonical experience belongs to the user
    const { data: experience, error: experienceError } = await supabaseAdmin
      .from('canonical_experiences')
      .select('id, user_id')
      .eq('id', canonicalExperienceId)
      .eq('user_id', userId)
      .single();

    if (experienceError || !experience) {
      return NextResponse.json(
        { error: 'Canonical experience not found or access denied' },
        { status: 404 }
      );
    }

    // Generate embedding for the new bullet
    const embedding = await embedText(promotedBullet.text);

    // Insert the enriched bullet into canonical_experience_bullets
    // Include both legacy columns (experience_id, text) AND Phase-2 columns
    const { data: newBullet, error: insertError } = await supabaseAdmin
      .from('canonical_experience_bullets')
      .insert({
        // Legacy columns (NOT NULL)
        experience_id: canonicalExperienceId,
        text: promotedBullet.text,
        // Phase-2 columns
        user_id: userId,
        canonical_experience_id: canonicalExperienceId,
        content: promotedBullet.text,
        source_bullet_ids: promotedBullet.sourceIds || [],
        source_count: promotedBullet.sourceIds?.length || 1,
        avg_similarity: 1.0, // High confidence since user approved it
        embedding,
        representative_bullet_id: null, // This is a promoted/enriched bullet
        origin: 'enrichment',
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ Error inserting enriched bullet:', insertError);
      return NextResponse.json(
        { error: 'Failed to enrich canonical profile', details: insertError.message },
        { status: 500 }
      );
    }

    console.log('✅ Canonical profile enriched:', {
      userId,
      experienceId: canonicalExperienceId,
      bulletId: newBullet.id,
      sourceCount: promotedBullet.sourceIds?.length || 0,
    });

    return NextResponse.json({
      success: true,
      bulletId: newBullet.id,
      message: 'Bullet promoted to canonical profile',
    });
  } catch (error) {
    console.error('❌ Profile enrichment error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/profile/enrich?experienceId=xxx
 * 
 * Retrieves enrichment candidates for a specific canonical experience.
 * These are bullets from recent resume generations that could be promoted.
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await requireAuth();
    const { searchParams } = new URL(request.url);
    const experienceId = searchParams.get('experienceId');

    if (!experienceId) {
      return NextResponse.json(
        { error: 'Missing experienceId parameter' },
        { status: 400 }
      );
    }

    // Verify ownership
    const { data: experience, error: experienceError } = await supabaseAdmin
      .from('canonical_experiences')
      .select('id, user_id, display_company, primary_title')
      .eq('id', experienceId)
      .eq('user_id', userId)
      .single();

    if (experienceError || !experience) {
      return NextResponse.json(
        { error: 'Canonical experience not found or access denied' },
        { status: 404 }
      );
    }

    // Get existing canonical bullets for this experience
    const { data: existingBullets } = await supabaseAdmin
      .from('canonical_experience_bullets')
      .select('content')
      .eq('canonical_experience_id', experienceId);

    const existingTexts = new Set(
      (existingBullets || []).map((b: { content: string }) => b.content.toLowerCase().trim())
    );

    // Find recent resume versions for this user
    const { data: recentResumes } = await supabaseAdmin
      .from('resume_versions')
      .select('id, content, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);

    // Extract bullets from resume content that match this experience
    const candidates: Array<{
      text: string;
      sourceIds: string[];
      mergedFrom?: string[];
      resumeId: string;
      createdAt: string;
    }> = [];

    for (const resume of recentResumes || []) {
      const content = resume.content as any;
      const experiences = content?.experience || [];

      for (const exp of experiences) {
        // Match by company/title (fuzzy match)
        const companyMatch = exp.company?.toLowerCase().includes(experience.display_company?.toLowerCase());
        const titleMatch = exp.title?.toLowerCase().includes(experience.primary_title?.toLowerCase());

        if (companyMatch || titleMatch) {
          const bullets = exp.bullets || [];
          for (const bullet of bullets) {
            const bulletText = typeof bullet === 'string' ? bullet : bullet.text;
            const sourceIds = typeof bullet === 'object' ? bullet.source_ids || [] : [];
            const mergedFrom = typeof bullet === 'object' ? bullet.merged_from || [] : [];

            // Only include if it's not already in canonical profile
            if (bulletText && !existingTexts.has(bulletText.toLowerCase().trim())) {
              candidates.push({
                text: bulletText,
                sourceIds,
                mergedFrom,
                resumeId: resume.id,
                createdAt: resume.created_at,
              });
            }
          }
        }
      }
    }

    // Deduplicate candidates
    const uniqueCandidates = Array.from(
      new Map(candidates.map((c) => [c.text.toLowerCase().trim(), c])).values()
    );

    return NextResponse.json({
      experienceId,
      company: experience.display_company,
      title: experience.primary_title,
      candidates: uniqueCandidates.slice(0, 10), // Limit to top 10
    });
  } catch (error) {
    console.error('❌ Error fetching enrichment candidates:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}



