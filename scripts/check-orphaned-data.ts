#!/usr/bin/env tsx
/**
 * Check for leftover data after documents are deleted
 * 
 * Usage: npx tsx scripts/check-orphaned-data.ts [userId]
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
});

async function checkOrphanedData() {
    const userId = process.argv[2];
    
    if (!userId) {
        console.error('❌ User ID required');
        console.log('Usage: npx tsx scripts/check-orphaned-data.ts <userId>');
        process.exit(1);
    }

    console.log(`🔍 Checking for leftover data for user: ${userId}\n`);

    try {
        // Check documents
        const { data: documents } = await supabaseAdmin
            .from('documents')
            .select('id, file_name')
            .eq('user_id', userId);

        console.log(`📄 Documents: ${documents?.length || 0}`);
        if (documents && documents.length > 0) {
            documents.forEach(doc => console.log(`   - ${doc.file_name} (${doc.id})`));
        }

        // Check experiences
        const { data: experiences } = await supabaseAdmin
            .from('experiences')
            .select('id, title, company, start_date, end_date')
            .eq('user_id', userId);

        console.log(`\n💼 Experiences: ${experiences?.length || 0}`);
        if (experiences && experiences.length > 0) {
            experiences.forEach(exp => {
                console.log(`   - ${exp.title} at ${exp.company} (${exp.start_date} - ${exp.end_date || 'Present'})`);
                console.log(`     ID: ${exp.id}`);
            });
        }

        // Check experience sources
        const experienceIds = experiences?.map(e => e.id) || [];
        let experienceSourcesCount = 0;
        if (experienceIds.length > 0) {
            const { data: sources } = await supabaseAdmin
                .from('experience_sources')
                .select('experience_id, document_id')
                .in('experience_id', experienceIds);
            
            experienceSourcesCount = sources?.length || 0;
        }
        console.log(`   Experience Sources: ${experienceSourcesCount}`);

        // Check experience bullets
        let bulletsCount = 0;
        let bulletSourcesCount = 0;
        if (experienceIds.length > 0) {
            const { data: bullets } = await supabaseAdmin
                .from('experience_bullets')
                .select('id, content')
                .in('experience_id', experienceIds);
            
            bulletsCount = bullets?.length || 0;
            
            if (bullets && bullets.length > 0) {
                const bulletIds = bullets.map(b => b.id);
                const { data: bulletSources } = await supabaseAdmin
                    .from('experience_bullet_sources')
                    .select('bullet_id, document_id')
                    .in('bullet_id', bulletIds);
                
                bulletSourcesCount = bulletSources?.length || 0;
            }
        }
        console.log(`   Experience Bullets: ${bulletsCount}`);
        console.log(`   Bullet Sources: ${bulletSourcesCount}`);

        // Check skills
        const { data: skills } = await supabaseAdmin
            .from('skills')
            .select('id, canonical_name')
            .eq('user_id', userId);

        console.log(`\n🎯 Skills: ${skills?.length || 0}`);
        if (skills && skills.length > 0) {
            skills.slice(0, 20).forEach(skill => {
                console.log(`   - ${skill.canonical_name} (${skill.id})`);
            });
            if (skills.length > 20) {
                console.log(`   ... and ${skills.length - 20} more`);
            }
        }

        // Check canonical experiences
        const { data: canonicalExperiences } = await supabaseAdmin
            .from('canonical_experiences')
            .select('id, display_company, primary_title, start_date, end_date')
            .eq('user_id', userId);

        console.log(`\n📋 Canonical Experiences: ${canonicalExperiences?.length || 0}`);
        if (canonicalExperiences && canonicalExperiences.length > 0) {
            canonicalExperiences.forEach(exp => {
                console.log(`   - ${exp.primary_title} at ${exp.display_company} (${exp.start_date} - ${exp.end_date || 'Present'})`);
                console.log(`     ID: ${exp.id}`);
            });
        }

        // Check canonical bullets
        let canonicalBulletsCount = 0;
        if (canonicalExperiences && canonicalExperiences.length > 0) {
            const canonicalExpIds = canonicalExperiences.map(e => e.id);
            const { data: canonicalBullets } = await supabaseAdmin
                .from('canonical_experience_bullets')
                .select('id, content')
                .in('canonical_experience_id', canonicalExpIds);
            
            canonicalBulletsCount = canonicalBullets?.length || 0;
        }
        console.log(`   Canonical Bullets: ${canonicalBulletsCount}`);

        // Check canonical skills
        const { data: canonicalSkills } = await supabaseAdmin
            .from('canonical_skills')
            .select('id, label')
            .eq('user_id', userId);

        console.log(`\n🏷️  Canonical Skills: ${canonicalSkills?.length || 0}`);
        if (canonicalSkills && canonicalSkills.length > 0) {
            canonicalSkills.slice(0, 20).forEach(skill => {
                console.log(`   - ${skill.label} (${skill.id})`);
            });
            if (canonicalSkills.length > 20) {
                console.log(`   ... and ${canonicalSkills.length - 20} more`);
            }
        }

        // Check education
        const { data: education } = await supabaseAdmin
            .from('canonical_education')
            .select('id, institution, degree')
            .eq('user_id', userId);

        console.log(`\n🎓 Education: ${education?.length || 0}`);
        if (education && education.length > 0) {
            education.forEach(edu => {
                console.log(`   - ${edu.degree || 'N/A'} at ${edu.institution} (${edu.id})`);
            });
        }

        // Check certifications
        const { data: certifications } = await supabaseAdmin
            .from('canonical_certifications')
            .select('id, name, issuer')
            .eq('user_id', userId);

        console.log(`\n📜 Certifications: ${certifications?.length || 0}`);
        if (certifications && certifications.length > 0) {
            certifications.forEach(cert => {
                console.log(`   - ${cert.name}${cert.issuer ? ` (${cert.issuer})` : ''} (${cert.id})`);
            });
        }

        // Summary
        console.log('\n' + '='.repeat(60));
        console.log('📊 SUMMARY:');
        console.log('='.repeat(60));
        console.log(`Documents: ${documents?.length || 0}`);
        console.log(`Experiences: ${experiences?.length || 0} (${experienceSourcesCount} sources)`);
        console.log(`Bullets: ${bulletsCount} (${bulletSourcesCount} sources)`);
        console.log(`Skills: ${skills?.length || 0}`);
        console.log(`Canonical Experiences: ${canonicalExperiences?.length || 0}`);
        console.log(`Canonical Bullets: ${canonicalBulletsCount}`);
        console.log(`Canonical Skills: ${canonicalSkills?.length || 0}`);
        console.log(`Education: ${education?.length || 0}`);
        console.log(`Certifications: ${certifications?.length || 0}`);

        // Check for orphaned data
        const hasOrphanedExperiences = (experiences?.length || 0) > 0 && experienceSourcesCount === 0;
        const hasOrphanedBullets = bulletsCount > 0 && bulletSourcesCount === 0;

        if (hasOrphanedExperiences || hasOrphanedBullets) {
            console.log('\n⚠️  ORPHANED DATA DETECTED:');
            if (hasOrphanedExperiences) {
                console.log(`   - ${experiences?.length || 0} experiences with no source documents`);
            }
            if (hasOrphanedBullets) {
                console.log(`   - ${bulletsCount} bullets with no source documents`);
            }
            console.log('\n💡 Run cleanup script: npx tsx scripts/cleanup-orphaned.ts ' + userId);
        } else if ((experiences?.length || 0) === 0 && (skills?.length || 0) === 0) {
            console.log('\n✅ No leftover data found - account is clean!');
        } else {
            console.log('\n✅ All data has source links - no orphaned data detected');
        }

        console.log('='.repeat(60));

    } catch (error: any) {
        console.error('\n❌ CHECK FAILED');
        console.error('='.repeat(60));
        console.error('Error:', error.message);
        if (error.stack) {
            console.error('\nStack trace:');
            console.error(error.stack);
        }
        console.error('='.repeat(60));
        throw error;
    }
}

checkOrphanedData().catch(console.error);



