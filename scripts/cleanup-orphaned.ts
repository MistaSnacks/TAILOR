#!/usr/bin/env tsx
/**
 * Cleanup Orphaned Experiences and Bullets
 * 
 * Removes experiences and bullets that have no remaining source documents.
 * This can happen when documents are deleted but the experiences/bullets persist.
 * 
 * Usage:
 *   npx tsx scripts/cleanup-orphaned.ts                    # Clean up for all users
 *   npx tsx scripts/cleanup-orphaned.ts <userId>           # Clean up for specific user
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials in .env.local');
    console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
    auth: {
        persistSession: false
    }
});

async function cleanupOrphaned(userId: string | null = null) {
    console.log('🧹 Cleaning up orphaned experiences and bullets...\n');

    try {
        // Get all experiences (filtered by user if specified)
        let query = supabaseAdmin
            .from('experiences')
            .select('id, user_id, title, company');
        
        if (userId) {
            query = query.eq('user_id', userId);
            console.log(`📋 Filtering for user: ${userId}\n`);
        }
        
        const { data: allExperiences, error: expError } = await query;

        if (expError) {
            console.error('❌ Error fetching experiences:', expError);
            return;
        }

        if (!allExperiences || allExperiences.length === 0) {
            console.log('✅ No experiences found');
            return;
        }

        console.log(`📊 Found ${allExperiences.length} total experience(s)\n`);

        // Get all experience sources
        const { data: allSources } = await supabaseAdmin
            .from('experience_sources')
            .select('experience_id');

        const sourceExperienceIds = new Set(
            (allSources || []).map((s: any) => s.experience_id)
        );

        // Find experiences with no sources
        const orphanedExperiences = allExperiences.filter(
            (exp: any) => !sourceExperienceIds.has(exp.id)
        );

        if (orphanedExperiences.length > 0) {
            console.log(`⚠️  Found ${orphanedExperiences.length} orphaned experience(s):\n`);
            orphanedExperiences.forEach((exp: any) => {
                console.log(`   - ${exp.title} at ${exp.company} (ID: ${exp.id})`);
            });
            console.log('');

            const orphanedIds = orphanedExperiences.map((e: any) => e.id);
            
            // Delete orphaned experiences (bullets will cascade delete)
            const { error: deleteError } = await supabaseAdmin
                .from('experiences')
                .delete()
                .in('id', orphanedIds);

            if (deleteError) {
                console.error('❌ Error deleting orphaned experiences:', deleteError);
            } else {
                console.log(`✅ Deleted ${orphanedIds.length} orphaned experience(s)\n`);
            }
        } else {
            console.log('✅ No orphaned experiences found\n');
        }

        // Check for orphaned bullets
        const remainingExpIds = (allExperiences || [])
            .filter((exp: any) => !orphanedExperiences.some((o: any) => o.id === exp.id))
            .map((e: any) => e.id);

        if (remainingExpIds.length === 0) {
            console.log('✅ No remaining experiences to check for orphaned bullets');
            return;
        }

        const { data: allBullets } = await supabaseAdmin
            .from('experience_bullets')
            .select('id, experience_id, content')
            .in('experience_id', remainingExpIds);

        if (!allBullets || allBullets.length === 0) {
            console.log('✅ No bullets found');
            return;
        }

        // Get all bullet sources
        const { data: allBulletSources } = await supabaseAdmin
            .from('experience_bullet_sources')
            .select('bullet_id');

        const sourceBulletIds = new Set(
            (allBulletSources || []).map((s: any) => s.bullet_id)
        );

        // Find bullets with no sources
        const orphanedBullets = allBullets.filter(
            (bullet: any) => !sourceBulletIds.has(bullet.id)
        );

        if (orphanedBullets.length > 0) {
            console.log(`⚠️  Found ${orphanedBullets.length} orphaned bullet(s):\n`);
            orphanedBullets.slice(0, 5).forEach((bullet: any) => {
                console.log(`   - "${bullet.content.substring(0, 60)}..." (ID: ${bullet.id})`);
            });
            if (orphanedBullets.length > 5) {
                console.log(`   ... and ${orphanedBullets.length - 5} more`);
            }
            console.log('');

            const orphanedBulletIds = orphanedBullets.map((b: any) => b.id);
            
            const { error: deleteBulletError } = await supabaseAdmin
                .from('experience_bullets')
                .delete()
                .in('id', orphanedBulletIds);

            if (deleteBulletError) {
                console.error('❌ Error deleting orphaned bullets:', deleteBulletError);
            } else {
                console.log(`✅ Deleted ${orphanedBulletIds.length} orphaned bullet(s)\n`);
            }
        } else {
            console.log('✅ No orphaned bullets found\n');
        }

        console.log('='.repeat(60));
        console.log('✨ Cleanup complete!');
        console.log('='.repeat(60));

    } catch (error: any) {
        console.error('\n❌ CLEANUP FAILED');
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

async function main() {
    const userId = process.argv[2] || null;
    
    if (userId) {
        await cleanupOrphaned(userId);
    } else {
        console.log('⚠️  Cleaning up orphaned data for ALL users...\n');
        await cleanupOrphaned(null);
    }
}

main().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
});

