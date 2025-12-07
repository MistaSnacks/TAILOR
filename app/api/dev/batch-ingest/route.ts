/**
 * DEV ONLY: Batch Ingest Test Profiles
 * 
 * This endpoint ingests all test profile documents at once.
 * For seeded test data, it directly uses the parsed_content JSON
 * instead of re-parsing text.
 * 
 * ONLY works in development mode.
 * 
 * Usage: GET /api/dev/batch-ingest
 * Or for a specific profile: GET /api/dev/batch-ingest?profile=teacher-tech
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { canonicalizeProfile } from '@/lib/profile-canonicalizer';

const TEST_EMAILS = [
  'principal.engineer@test.tailor.dev',
  'retail.worker@test.tailor.dev',
  'teacher.to.tech@test.tailor.dev',
  'warehouse.operator@test.tailor.dev',
  'government.employee@test.tailor.dev',
];

const PROFILE_MAP: Record<string, string> = {
  'principal-engineer': 'principal.engineer@test.tailor.dev',
  'retail-worker': 'retail.worker@test.tailor.dev',
  'teacher-tech': 'teacher.to.tech@test.tailor.dev',
  'warehouse-operator': 'warehouse.operator@test.tailor.dev',
  'government-employee': 'government.employee@test.tailor.dev',
};

interface ParsedExperience {
  company: string;
  title: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  isCurrent?: boolean;
  bullets?: string[];
}

export async function GET(request: NextRequest) {
  // ONLY allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'This endpoint is only available in development' },
      { status: 403 }
    );
  }

  const profileParam = request.nextUrl.searchParams.get('profile');
  const emailsToProcess = profileParam 
    ? [PROFILE_MAP[profileParam]].filter(Boolean)
    : TEST_EMAILS;

  if (profileParam && !PROFILE_MAP[profileParam]) {
    return NextResponse.json({
      error: `Unknown profile: ${profileParam}`,
      available: Object.keys(PROFILE_MAP),
    }, { status: 400 });
  }

  console.log('\n🔄 ========== BATCH INGESTION STARTING ==========');
  console.log(`Processing ${emailsToProcess.length} test profile(s)...`);

  const results: Array<{
    email: string;
    name: string;
    documentsProcessed: number;
    experiences: number;
    bullets: number;
    skills: number;
    canonicalExperiences: number;
    canonicalSkills: number;
    errors: string[];
  }> = [];

  for (const email of emailsToProcess) {
    console.log(`\n📋 Processing: ${email}`);
    
    const profileResult = {
      email,
      name: '',
      documentsProcessed: 0,
      experiences: 0,
      bullets: 0,
      skills: 0,
      canonicalExperiences: 0,
      canonicalSkills: 0,
      errors: [] as string[],
    };

    try {
      // Get user
      const { data: user, error: userError } = await supabaseAdmin
        .from('users')
        .select('id, name')
        .eq('email', email)
        .single();

      if (userError || !user) {
        profileResult.errors.push(`User not found: ${email}`);
        results.push(profileResult);
        continue;
      }

      profileResult.name = user.name || email;
      const userId = user.id;

      // Get all documents for this user
      const { data: documents, error: docsError } = await supabaseAdmin
        .from('documents')
        .select('id, file_name, parsed_content')
        .eq('user_id', userId)
        .eq('parse_status', 'completed');

      if (docsError || !documents?.length) {
        profileResult.errors.push('No completed documents found');
        results.push(profileResult);
        continue;
      }

      console.log(`   Found ${documents.length} documents`);

      // Clear existing ingested data for clean re-ingest
      console.log(`   🧹 Clearing existing data...`);
      
      try {
        // Delete canonical data first (no foreign key deps)
        await supabaseAdmin.from('canonical_experience_bullets').delete().eq('user_id', userId);
        await supabaseAdmin.from('canonical_experiences').delete().eq('user_id', userId);
        await supabaseAdmin.from('canonical_skills').delete().eq('user_id', userId);

        // Get existing experience IDs
        const { data: existingExps } = await supabaseAdmin
          .from('experiences')
          .select('id')
          .eq('user_id', userId);
        
        if (existingExps && existingExps.length > 0) {
          const expIds = existingExps.map((e: { id: string }) => e.id);
          
          // Get bullet IDs for these experiences
          const { data: existingBullets } = await supabaseAdmin
            .from('experience_bullets')
            .select('id')
            .in('experience_id', expIds);
          
          if (existingBullets && existingBullets.length > 0) {
            const bulletIds = existingBullets.map((b: { id: string }) => b.id);
            await supabaseAdmin.from('experience_bullet_sources').delete().in('bullet_id', bulletIds);
          }
          
          await supabaseAdmin.from('experience_bullets').delete().in('experience_id', expIds);
          await supabaseAdmin.from('experience_sources').delete().in('experience_id', expIds);
          await supabaseAdmin.from('experience_skills').delete().in('experience_id', expIds);
        }
        
        await supabaseAdmin.from('experiences').delete().eq('user_id', userId);
        
        // Get existing skill IDs
        const { data: existingSkills } = await supabaseAdmin
          .from('skills')
          .select('id')
          .eq('user_id', userId);
        
        if (existingSkills && existingSkills.length > 0) {
          const skillIds = existingSkills.map((s: { id: string }) => s.id);
          await supabaseAdmin.from('skill_aliases').delete().in('skill_id', skillIds);
        }
        
        await supabaseAdmin.from('skills').delete().eq('user_id', userId);
        
        console.log(`   ✅ Cleared existing data`);
      } catch (cleanupErr) {
        console.log(`   ⚠️ Cleanup warning (continuing): ${cleanupErr}`);
      }

      // Track unique experiences by company+title+dates
      const experienceMap = new Map<string, {
        company: string;
        title: string;
        location?: string;
        startDate?: string;
        endDate?: string;
        isCurrent: boolean;
        bullets: Set<string>;
        documentIds: Set<string>;
      }>();

      // Track all skills
      const skillSet = new Set<string>();

      // Process each document
      for (const doc of documents) {
        try {
          const parsedContent = doc.parsed_content as any;
          
          if (!parsedContent) {
            profileResult.errors.push(`${doc.file_name}: No parsed_content`);
            continue;
          }

          // Extract experiences
          const experiences = parsedContent.experiences || [];
          for (const exp of experiences as ParsedExperience[]) {
            const key = `${exp.company}|${exp.title}|${exp.startDate || ''}|${exp.endDate || ''}`;
            
            if (!experienceMap.has(key)) {
              experienceMap.set(key, {
                company: exp.company,
                title: exp.title,
                location: exp.location,
                startDate: exp.startDate,
                endDate: exp.endDate,
                isCurrent: exp.isCurrent || exp.endDate === 'Present',
                bullets: new Set(),
                documentIds: new Set(),
              });
            }
            
            const expData = experienceMap.get(key)!;
            expData.documentIds.add(doc.id);
            
            // Add bullets
            if (exp.bullets) {
              for (const bullet of exp.bullets) {
                if (bullet && bullet.trim()) {
                  expData.bullets.add(bullet.trim());
                }
              }
            }
          }

          // Extract skills
          const skills = parsedContent.skills || [];
          for (const skill of skills) {
            if (skill && typeof skill === 'string' && skill.trim()) {
              skillSet.add(skill.trim());
            }
          }

          profileResult.documentsProcessed++;
          console.log(`   ✅ Processed: ${doc.file_name}`);
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : 'Unknown error';
          profileResult.errors.push(`${doc.file_name}: ${errMsg}`);
          console.log(`   ❌ Failed: ${doc.file_name} - ${errMsg}`);
        }
      }

      // Insert experiences and bullets
      console.log(`   📝 Inserting ${experienceMap.size} unique experiences...`);
      
      for (const [key, expData] of experienceMap) {
        try {
          // Insert experience
          const { data: newExp, error: expError } = await supabaseAdmin
            .from('experiences')
            .insert({
              user_id: userId,
              company: expData.company,
              title: expData.title,
              location: expData.location,
              start_date: expData.startDate,
              end_date: expData.endDate,
              is_current: expData.isCurrent,
              source_count: expData.documentIds.size,
            })
            .select('id')
            .single();

          if (expError || !newExp) {
            console.log(`   ⚠️ Failed to insert experience: ${expData.company} - ${expError?.message}`);
            continue;
          }

          profileResult.experiences++;

          // Insert experience sources
          for (const docId of expData.documentIds) {
            await supabaseAdmin.from('experience_sources').insert({
              experience_id: newExp.id,
              document_id: docId,
            });
          }

          // Insert bullets with embeddings
          for (const bulletContent of expData.bullets) {
            try {
              // Generate embedding for bullet
              let embedding = null;
              try {
                embedding = await embedText(bulletContent);
              } catch (embErr) {
                console.log(`   ⚠️ Embedding failed for bullet: ${embErr instanceof Error ? embErr.message : 'Unknown error'}`);
              }

              const { data: newBullet, error: bulletError } = await supabaseAdmin
                .from('experience_bullets')
                .insert({
                  experience_id: newExp.id,
                  content: bulletContent,
                  embedding: embedding,
                  source_count: 1,
                })
                .select('id')
                .single();

              if (newBullet) {
                profileResult.bullets++;
                
                // Link bullet to source documents
                for (const docId of expData.documentIds) {
                  await supabaseAdmin.from('experience_bullet_sources').insert({
                    bullet_id: newBullet.id,
                    document_id: docId,
                  });
                }
              }
            } catch (bulletErr) {
              // Continue with other bullets
            }
          }
        } catch (err) {
          console.log(`   ⚠️ Error processing experience: ${err}`);
        }
      }

      // Insert skills
      console.log(`   🎯 Inserting ${skillSet.size} skills...`);
      
      for (const skillName of skillSet) {
        try {
          const { error: skillError } = await supabaseAdmin
            .from('skills')
            .insert({
              user_id: userId,
              canonical_name: skillName,
              source_count: 1,
            });

          if (!skillError) {
            profileResult.skills++;
          } else {
            console.log(`   ⚠️ Skill insert error: ${skillError.message}`);
          }
        } catch (skillErr) {
          console.log(`   ⚠️ Skill processing error: ${skillErr}`);
        }
      }

      // Run canonicalization
      try {
        console.log(`   🔄 Running canonicalization...`);
        await canonicalizeProfile(userId);
        console.log(`   ✅ Canonicalization complete`);
      } catch (err) {
        profileResult.errors.push(`Canonicalization: ${err instanceof Error ? err.message : 'Unknown error'}`);
        console.log(`   ⚠️ Canonicalization error: ${err}`);
      }

      // Get final counts
      const { count: canExpCount } = await supabaseAdmin
        .from('canonical_experiences')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);
      
      const { count: canSkillCount } = await supabaseAdmin
        .from('canonical_skills')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      profileResult.canonicalExperiences = canExpCount || 0;
      profileResult.canonicalSkills = canSkillCount || 0;

    } catch (err) {
      profileResult.errors.push(`Fatal: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }

    results.push(profileResult);
    console.log(`   📊 Results: ${profileResult.documentsProcessed} docs, ${profileResult.experiences} exp, ${profileResult.bullets} bullets, ${profileResult.skills} skills`);
  }

  console.log('\n========== BATCH INGESTION COMPLETE ==========\n');

  return NextResponse.json({
    success: true,
    processed: results.length,
    results,
    summary: {
      totalDocuments: results.reduce((sum, r) => sum + r.documentsProcessed, 0),
      totalExperiences: results.reduce((sum, r) => sum + r.experiences, 0),
      totalBullets: results.reduce((sum, r) => sum + r.bullets, 0),
      totalSkills: results.reduce((sum, r) => sum + r.skills, 0),
      totalCanonicalExperiences: results.reduce((sum, r) => sum + r.canonicalExperiences, 0),
      totalCanonicalSkills: results.reduce((sum, r) => sum + r.canonicalSkills, 0),
      errors: results.reduce((sum, r) => sum + r.errors.length, 0),
    },
  });
}
