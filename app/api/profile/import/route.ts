import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth-utils';
import { embedText } from '@/lib/gemini';
import { canonicalizeProfile } from '@/lib/profile-canonicalizer';
import {
  parseLinkedInContent,
  parsePortfolioContent,
  isLinkedInUrl,
  normalizeUrl,
  type ParsedExternalProfile,
  type ExternalExperience,
  type ExternalProject,
} from '@/lib/external-profile-parser';

// 🔑 Environment variable logging (REMOVE IN PRODUCTION)
console.log('⚡ Profile Import API - Environment check:', {
  supabase: !!supabaseAdmin ? '✅' : '❌',
  gemini: process.env.GEMINI_API_KEY ? '✅' : '❌',
});

/**
 * POST /api/profile/import
 * 
 * Import profile data from LinkedIn or portfolio URL
 * 
 * Body:
 * - url: string (LinkedIn profile URL or portfolio website URL)
 * - type: 'linkedin' | 'portfolio' | 'auto' (optional, defaults to auto-detect)
 */
export async function POST(request: NextRequest) {
  console.log('🔄 Profile Import API - POST request received');

  try {
    const userId = await requireAuth();
    console.log('🔐 Profile Import API - User authenticated:', userId ? '✅' : '❌');

    const body = await request.json();
    const { url, type = 'auto', scrapeContent } = body;

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    // Normalize and validate URL
    let normalizedUrl: string;
    try {
      normalizedUrl = normalizeUrl(url);
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    // Determine source type
    const sourceType = type === 'auto' 
      ? (isLinkedInUrl(normalizedUrl) ? 'linkedin' : 'portfolio')
      : type;

    console.log('📥 Importing profile from:', {
      url: normalizedUrl.substring(0, 50) + '...',
      type: sourceType,
      hasScrapedContent: !!scrapeContent,
    });

    // If scrapeContent is provided (from client-side Firecrawl), use it directly
    // Otherwise, we need the client to scrape first
    if (!scrapeContent) {
      return NextResponse.json(
        { 
          error: 'Scraped content required',
          message: 'Please provide the scraped markdown content from the URL',
          needsScrape: true,
          url: normalizedUrl,
          type: sourceType,
        },
        { status: 400 }
      );
    }

    // Parse the scraped content
    console.log('🔍 Parsing scraped content...');
    let parsedProfile: ParsedExternalProfile;
    
    try {
      if (sourceType === 'linkedin') {
        parsedProfile = await parseLinkedInContent(scrapeContent, normalizedUrl);
      } else {
        parsedProfile = await parsePortfolioContent(scrapeContent, normalizedUrl);
      }
    } catch (parseError: any) {
      console.error('❌ Failed to parse content:', parseError);
      return NextResponse.json(
        { error: 'Failed to parse profile content', details: parseError.message },
        { status: 500 }
      );
    }

    console.log('✅ Parsed profile:', {
      source: parsedProfile.source,
      name: parsedProfile.name,
      experiences: parsedProfile.experiences.length,
      projects: parsedProfile.projects.length,
      skills: parsedProfile.skills.length,
      education: parsedProfile.education.length,
      certifications: parsedProfile.certifications.length,
    });

    // Import the parsed data into the user's profile
    const importResult = await importParsedProfile(userId, parsedProfile);

    // Trigger canonicalization to merge with existing data
    console.log('🔄 Triggering profile canonicalization...');
    try {
      await canonicalizeProfile(userId);
      console.log('✅ Profile canonicalized');
    } catch (canonError: any) {
      console.error('⚠️ Canonicalization failed:', canonError.message);
    }

    return NextResponse.json({
      success: true,
      source: parsedProfile.source,
      sourceUrl: parsedProfile.sourceUrl,
      imported: {
        name: parsedProfile.name,
        experiences: importResult.experiences,
        projects: importResult.projects,
        skills: importResult.skills,
        education: importResult.education,
        certifications: importResult.certifications,
      },
      message: `Successfully imported profile from ${sourceType}`,
    });

  } catch (error: any) {
    console.error('❌ Profile Import API error:', error);

    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Import parsed external profile data into user's canonical profile
 */
async function importParsedProfile(
  userId: string,
  profile: ParsedExternalProfile
): Promise<{
  experiences: number;
  projects: number;
  skills: number;
  education: number;
  certifications: number;
}> {
  const results = {
    experiences: 0,
    projects: 0,
    skills: 0,
    education: 0,
    certifications: 0,
  };

  // Update profile name/headline if available and not already set
  if (profile.name || profile.headline) {
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('full_name')
      .eq('user_id', userId)
      .single();

    const updates: Record<string, string> = {};
    if (profile.name && !existingProfile?.full_name) {
      updates.full_name = profile.name;
    }
    // Store source URL
    if (profile.source === 'linkedin') {
      updates.linkedin_url = profile.sourceUrl;
    } else {
      updates.portfolio_url = profile.sourceUrl;
    }

    if (Object.keys(updates).length > 0) {
      await supabaseAdmin
        .from('profiles')
        .update(updates)
        .eq('user_id', userId);
    }
  }

  // Import experiences
  for (const exp of profile.experiences) {
    try {
      await importExperience(userId, exp, profile.source);
      results.experiences++;
    } catch (error: any) {
      console.error(`❌ Failed to import experience: ${exp.company}`, error.message);
    }
  }

  // Import projects as experiences (with special handling)
  for (const project of profile.projects) {
    try {
      await importProject(userId, project, profile.source);
      results.projects++;
    } catch (error: any) {
      console.error(`❌ Failed to import project: ${project.name}`, error.message);
    }
  }

  // Import skills
  for (const skill of profile.skills) {
    try {
      await importSkill(userId, skill);
      results.skills++;
    } catch (error: any) {
      // Skill already exists is not an error
      if (error.code !== '23505') { // Unique constraint violation
        console.error(`❌ Failed to import skill: ${skill}`, error.message);
      }
    }
  }

  // Import education
  for (const edu of profile.education) {
    try {
      await importEducation(userId, edu);
      results.education++;
    } catch (error: any) {
      console.error(`❌ Failed to import education: ${edu.institution}`, error.message);
    }
  }

  // Import certifications
  for (const cert of profile.certifications) {
    try {
      await importCertification(userId, cert);
      results.certifications++;
    } catch (error: any) {
      console.error(`❌ Failed to import certification: ${cert.name}`, error.message);
    }
  }

  return results;
}

async function importExperience(
  userId: string,
  exp: ExternalExperience,
  source: string
): Promise<void> {
  if (!exp.company?.trim() || !exp.title?.trim()) {
    throw new Error('Missing company or title');
  }

  // Check if experience already exists
  const { data: existing } = await supabaseAdmin
    .from('experiences')
    .select('id')
    .eq('user_id', userId)
    .ilike('company', exp.company)
    .ilike('title', exp.title)
    .maybeSingle();

  let experienceId: string;

  if (existing) {
    experienceId = existing.id;
    console.log(`📝 Experience already exists: ${exp.title} @ ${exp.company}`);
  } else {
    // Create new experience
    const { data: newExp, error } = await supabaseAdmin
      .from('experiences')
      .insert({
        user_id: userId,
        company: exp.company.trim(),
        title: exp.title.trim(),
        location: exp.location?.trim() || null,
        start_date: exp.startDate?.trim() || null,
        end_date: exp.isCurrent ? null : (exp.endDate?.trim() || null),
        is_current: exp.isCurrent || false,
        // Note: source_type column not in schema, track source via console logs
      })
      .select('id')
      .single();

    if (error) throw error;
    experienceId = newExp.id;
    console.log(`✅ Created experience from ${source}: ${exp.title} @ ${exp.company}`);
  }

  // Add bullets
  for (const bulletText of exp.bullets || []) {
    if (!bulletText?.trim()) continue;

    try {
      const embedding = await embedText(bulletText);

      // Check for duplicate bullet
      const { data: existingBullets } = await supabaseAdmin.rpc('match_experience_bullets', {
        query_embedding: embedding,
        match_threshold: 0.92,
        match_count: 1,
        filter_user_id: userId,
      });

      if (existingBullets && existingBullets.length > 0) {
        // Bullet already exists, increment source count
        await supabaseAdmin
          .from('experience_bullets')
          .update({ source_count: (existingBullets[0].source_count || 1) + 1 })
          .eq('id', existingBullets[0].id);
      } else {
        // Create new bullet
        await supabaseAdmin
          .from('experience_bullets')
          .insert({
            experience_id: experienceId,
            content: bulletText.trim(),
            embedding,
            importance_score: calculateBulletImportance(bulletText),
          });
      }
    } catch (bulletError: any) {
      console.warn(`⚠️ Failed to add bullet: ${bulletError.message}`);
    }
  }
}

async function importProject(
  userId: string,
  project: ExternalProject,
  source: string
): Promise<void> {
  if (!project.name?.trim()) {
    throw new Error('Missing project name');
  }

  // Store projects as experiences with a special marker
  // Company = "Personal Project" or project name, Title = project name
  const company = 'Personal Project';
  const title = project.name.trim();

  // Check if project already exists
  const { data: existing } = await supabaseAdmin
    .from('experiences')
    .select('id')
    .eq('user_id', userId)
    .ilike('company', company)
    .ilike('title', title)
    .maybeSingle();

  let experienceId: string;

  if (existing) {
    experienceId = existing.id;
  } else {
    const { data: newExp, error } = await supabaseAdmin
      .from('experiences')
      .insert({
        user_id: userId,
        company,
        title,
        location: project.url || null, // Store URL in location for projects
        start_date: project.startDate || null,
        end_date: project.endDate || null,
        is_current: false,
      })
      .select('id')
      .single();

    if (error) throw error;
    experienceId = newExp.id;
    console.log(`✅ Created project as experience from ${source}: ${project.name}`);
  }

  // Add project description and bullets
  const allBullets = [
    ...(project.description ? [project.description] : []),
    ...(project.bullets || []),
  ];

  // Add technologies as a bullet
  if (project.technologies?.length > 0) {
    allBullets.push(`Technologies: ${project.technologies.join(', ')}`);
  }

  for (const bulletText of allBullets) {
    if (!bulletText?.trim()) continue;

    try {
      const embedding = await embedText(bulletText);

      const { data: existingBullets } = await supabaseAdmin.rpc('match_experience_bullets', {
        query_embedding: embedding,
        match_threshold: 0.92,
        match_count: 1,
        filter_user_id: userId,
      });

      if (!existingBullets || existingBullets.length === 0) {
        await supabaseAdmin
          .from('experience_bullets')
          .insert({
            experience_id: experienceId,
            content: bulletText.trim(),
            embedding,
            importance_score: calculateBulletImportance(bulletText),
          });
      }
    } catch (bulletError: any) {
      console.warn(`⚠️ Failed to add project bullet: ${bulletError.message}`);
    }
  }

  // Also add technologies as skills
  for (const tech of project.technologies || []) {
    try {
      await importSkill(userId, tech);
    } catch {
      // Ignore skill import errors
    }
  }
}

async function importSkill(userId: string, skillName: string): Promise<void> {
  const normalized = skillName.trim();
  if (!normalized) return;

  // Check if skill already exists
  const { data: existing } = await supabaseAdmin
    .from('skills')
    .select('id, source_count')
    .eq('user_id', userId)
    .ilike('canonical_name', normalized)
    .maybeSingle();

  if (existing) {
    // Increment source count
    await supabaseAdmin
      .from('skills')
      .update({ source_count: (existing.source_count || 1) + 1 })
      .eq('id', existing.id);
  } else {
    // Create new skill
    await supabaseAdmin
      .from('skills')
      .insert({
        user_id: userId,
        canonical_name: normalized,
        source_count: 1,
      });
  }
}

async function importEducation(
  userId: string,
  edu: { institution: string; degree?: string; field?: string; startDate?: string; endDate?: string }
): Promise<void> {
  if (!edu.institution?.trim()) return;

  // Check if education already exists
  const { data: existing } = await supabaseAdmin
    .from('canonical_education')
    .select('id')
    .eq('user_id', userId)
    .ilike('institution', edu.institution)
    .maybeSingle();

  if (!existing) {
    await supabaseAdmin
      .from('canonical_education')
      .insert({
        user_id: userId,
        institution: edu.institution.trim(),
        degree: edu.degree?.trim() || null,
        field_of_study: edu.field?.trim() || null,
        start_date: edu.startDate?.trim() || null,
        end_date: edu.endDate?.trim() || null,
        source_count: 1,
      });
  }
}

async function importCertification(
  userId: string,
  cert: { name: string; issuer?: string; date?: string }
): Promise<void> {
  if (!cert.name?.trim()) return;

  // Check if certification already exists
  const { data: existing } = await supabaseAdmin
    .from('canonical_certifications')
    .select('id')
    .eq('user_id', userId)
    .ilike('name', cert.name)
    .maybeSingle();

  if (!existing) {
    await supabaseAdmin
      .from('canonical_certifications')
      .insert({
        user_id: userId,
        name: cert.name.trim(),
        issuer: cert.issuer?.trim() || null,
        issue_date: cert.date?.trim() || null,
        source_count: 1,
      });
  }
}

/**
 * Calculate importance score for a bullet
 */
function calculateBulletImportance(text: string): number {
  let score = 0;

  // Metrics/numbers
  if (/\d+%/.test(text)) score += 15;
  if (/\$[\d,]+/.test(text)) score += 15;
  if (/\d+[xX]\s/.test(text)) score += 10;

  // Action verbs
  if (/^(led|managed|developed|implemented|designed|created|built|launched|optimized|automated)/i.test(text)) {
    score += 20;
  }

  // Technical terms
  if (/\b(api|etl|ml|ai|aws|cloud|kubernetes|docker|react|python)\b/i.test(text)) {
    score += 10;
  }

  // Length bonus
  const words = text.split(/\s+/).length;
  if (words >= 10 && words <= 40) score += 15;

  return Math.min(score, 100);
}

