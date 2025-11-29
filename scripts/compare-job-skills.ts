#!/usr/bin/env tsx
/**
 * Compare extracted skills from a job description with Jobscan's analysis
 * 
 * Usage: npx tsx scripts/compare-job-skills.ts [company] [jobId]
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { parseJobDescriptionToContext } from '../lib/rag/parser';

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

// Jobscan's extracted skills
const JOBSCAN_HARD_SKILLS = {
    'Snapchat': { matched: 0, total: 4 },
    'Tooling': { matched: 3, total: 3 },
    'Machine learning': { matched: 1, total: 2 },
    'Data visualization software': { matched: 0, total: 1 },
    'Operational Support': { matched: 0, total: 1 },
    'Process development': { matched: 1, total: 1 },
    'Content Moderation': { matched: 1, total: 1 },
    'Safety operations': { matched: 2, total: 1 },
    'Analytical skills': { matched: 0, total: 1 },
    'Business Insights': { matched: 1, total: 1 },
    'Identify trends': { matched: 2, total: 1 },
    'Large data sets': { matched: 2, total: 1 },
    'Computer vision': { matched: 1, total: 1 },
    'Advanced excel': { matched: 1, total: 1 },
    'Public policy': { matched: 1, total: 1 },
    'Management': { matched: 11, total: 1 },
    'Research': { matched: 0, total: 1 },
    'Workflow': { matched: 5, total: 1 },
    'Grafana': { matched: 0, total: 1 },
    'Looker': { matched: 1, total: 1 },
    'Syntax': { matched: 0, total: 1 },
    'Flex': { matched: 0, total: 1 },
};

const JOBSCAN_SOFT_SKILLS = {
    'Verbal and written communication skills': { matched: 0, total: 1 },
    'Identifying opportunities': { matched: 0, total: 1 },
    'Strong analytical skills': { matched: 0, total: 1 },
    'Communicate effectively': { matched: 0, total: 1 },
    'Ability to prioritize': { matched: 0, total: 1 },
    'Creative': { matched: 0, total: 1 },
};

function normalizeSkill(skill: string): string {
    return skill.toLowerCase().trim();
}

function findMatches(ourSkills: string[], jobscanSkill: string): string[] {
    const normalized = normalizeSkill(jobscanSkill);
    const matches: string[] = [];
    
    for (const ourSkill of ourSkills) {
        const ourNormalized = normalizeSkill(ourSkill);
        
        // Exact match
        if (ourNormalized === normalized) {
            matches.push(ourSkill);
            continue;
        }
        
        // Contains match (our skill contains jobscan skill or vice versa)
        if (ourNormalized.includes(normalized) || normalized.includes(ourNormalized)) {
            matches.push(ourSkill);
            continue;
        }
        
        // Word-by-word match for multi-word skills
        const jobscanWords = normalized.split(/\s+/);
        const ourWords = ourNormalized.split(/\s+/);
        
        // Check if all jobscan words appear in our skill
        if (jobscanWords.every(word => ourWords.some(w => w.includes(word) || word.includes(w)))) {
            matches.push(ourSkill);
        }
    }
    
    return matches;
}

async function compareSkills() {
    const company = process.argv[2] || 'Snap';
    const jobId = process.argv[3];
    
    console.log('🔍 Comparing extracted skills with Jobscan analysis...\n');
    console.log(`Company: ${company}`);
    if (jobId) {
        console.log(`Job ID: ${jobId}\n`);
    }

    try {
        let query = supabaseAdmin
            .from('jobs')
            .select('id, title, company, description, required_skills, created_at')
            .order('created_at', { ascending: false })
            .limit(10);
        
        if (jobId) {
            query = query.eq('id', jobId);
        } else if (company) {
            query = query.ilike('company', `%${company}%`);
        }
        
        const { data: jobs, error: jobsError } = await query;

        if (jobsError) {
            console.error('❌ Error fetching jobs:', jobsError);
            return;
        }

        if (!jobs || jobs.length === 0) {
            console.log('⚠️  No jobs found');
            return;
        }

        // Use the most recent job
        const job = jobs[0];
        console.log(`\n📋 Job: ${job.title} at ${job.company || 'Unknown'}`);
        console.log(`   ID: ${job.id}`);
        console.log(`   Created: ${job.created_at}\n`);

        // Try to parse the job description using our parser
        // Note: This requires Gemini API key
        let parsed;
        try {
            console.log('🔧 Parsing job description with our parser...\n');
            parsed = await parseJobDescriptionToContext({
                title: job.title,
                description: job.description
            });
        } catch (error: any) {
            if (error.message.includes('Gemini API key')) {
                console.log('⚠️  Gemini API key not configured - cannot parse job description\n');
                console.log('📋 Showing Jobscan comparison with job description text analysis instead...\n');
                parsed = null;
            } else {
                throw error;
            }
        }

        if (parsed) {
            console.log('📊 OUR EXTRACTED SKILLS:\n');
            console.log(`Hard Skills (${parsed.hardSkills.length}):`);
            parsed.hardSkills.forEach((skill, i) => {
                console.log(`   ${i + 1}. ${skill}`);
            });
            
            console.log(`\nSoft Skills (${parsed.softSkills.length}):`);
            parsed.softSkills.forEach((skill, i) => {
                console.log(`   ${i + 1}. ${skill}`);
            });
        } else {
            console.log('📊 OUR PARSER TARGETS:\n');
            console.log('Our parser extracts 30-50 hard skills including:');
            console.log('   - Tools & software (SQL, Python, Excel, Tableau, etc.)');
            console.log('   - Platforms & systems (AWS, Stripe, CRM, etc.)');
            console.log('   - Methodologies (Agile, Six Sigma, etc.)');
            console.log('   - Regulations & compliance (SOX, GDPR, PCI, etc.)');
            console.log('   - Technical concepts (data analysis, ETL, API, etc.)');
            console.log('   - Multi-word phrases (e.g., "cross-functional collaboration")');
            console.log('\nAnd 15-20 soft skills including:');
            console.log('   - Communication traits');
            console.log('   - Collaboration skills');
            console.log('   - Leadership');
            console.log('   - Problem-solving');
            console.log('   - Work style');
            console.log('\n⚠️  Cannot show actual extracted skills without Gemini API key');
        }

        console.log(`\n\n📊 JOBCAN'S SKILLS:\n`);
        console.log(`Hard Skills (${Object.keys(JOBSCAN_HARD_SKILLS).length}):`);
        Object.entries(JOBSCAN_HARD_SKILLS).forEach(([skill, stats], i) => {
            console.log(`   ${i + 1}. ${skill} (matched: ${stats.matched}/${stats.total})`);
        });
        
        console.log(`\nSoft Skills (${Object.keys(JOBSCAN_SOFT_SKILLS).length}):`);
        Object.entries(JOBSCAN_SOFT_SKILLS).forEach(([skill, stats], i) => {
            console.log(`   ${i + 1}. ${skill} (matched: ${stats.matched}/${stats.total})`);
        });

        // Compare
        console.log('\n\n🔍 COMPARISON:\n');
        
        if (!parsed) {
            console.log('📋 JOBCAN SKILLS ANALYSIS:\n');
            console.log('Hard Skills Jobscan Found:');
            Object.entries(JOBSCAN_HARD_SKILLS).forEach(([skill, stats]) => {
                console.log(`   - ${skill} (matched: ${stats.matched}/${stats.total})`);
            });
            console.log('\nSoft Skills Jobscan Found:');
            Object.entries(JOBSCAN_SOFT_SKILLS).forEach(([skill, stats]) => {
                console.log(`   - ${skill} (matched: ${stats.matched}/${stats.total})`);
            });
            console.log('\n💡 To see our extracted skills, ensure GEMINI_API_KEY is set in .env.local');
            console.log('💡 Our parser should extract similar skills from the job description');
            return;
        }
        
        console.log('✅ HARD SKILLS MATCHES:\n');
        let matchedCount = 0;
        let missingCount = 0;
        
        for (const [jobscanSkill, stats] of Object.entries(JOBSCAN_HARD_SKILLS)) {
            const matches = findMatches(parsed.hardSkills, jobscanSkill);
            if (matches.length > 0) {
                console.log(`   ✅ ${jobscanSkill}`);
                console.log(`      Our matches: ${matches.join(', ')}`);
                matchedCount++;
            } else {
                console.log(`   ❌ ${jobscanSkill} - MISSING`);
                missingCount++;
            }
        }
        
        console.log(`\n📈 Hard Skills Summary:`);
        console.log(`   Matched: ${matchedCount}/${Object.keys(JOBSCAN_HARD_SKILLS).length}`);
        console.log(`   Missing: ${missingCount}/${Object.keys(JOBSCAN_HARD_SKILLS).length}`);
        console.log(`   Match Rate: ${((matchedCount / Object.keys(JOBSCAN_HARD_SKILLS).length) * 100).toFixed(1)}%`);

        console.log('\n\n✅ SOFT SKILLS MATCHES:\n');
        let softMatchedCount = 0;
        let softMissingCount = 0;
        
        for (const [jobscanSkill, stats] of Object.entries(JOBSCAN_SOFT_SKILLS)) {
            const matches = findMatches(parsed.softSkills, jobscanSkill);
            if (matches.length > 0) {
                console.log(`   ✅ ${jobscanSkill}`);
                console.log(`      Our matches: ${matches.join(', ')}`);
                softMatchedCount++;
            } else {
                console.log(`   ❌ ${jobscanSkill} - MISSING`);
                softMissingCount++;
            }
        }
        
        console.log(`\n📈 Soft Skills Summary:`);
        console.log(`   Matched: ${softMatchedCount}/${Object.keys(JOBSCAN_SOFT_SKILLS).length}`);
        console.log(`   Missing: ${softMissingCount}/${Object.keys(JOBSCAN_SOFT_SKILLS).length}`);
        console.log(`   Match Rate: ${((softMatchedCount / Object.keys(JOBSCAN_SOFT_SKILLS).length) * 100).toFixed(1)}%`);

        // Show skills we extracted that Jobscan didn't
        if (parsed) {
            console.log('\n\n➕ SKILLS WE EXTRACTED BUT JOBCAN DIDN\'T:\n');
            const jobscanAllSkills = new Set([
                ...Object.keys(JOBSCAN_HARD_SKILLS).map(normalizeSkill),
                ...Object.keys(JOBSCAN_SOFT_SKILLS).map(normalizeSkill)
            ]);
            
            const ourUniqueHard = parsed.hardSkills.filter(skill => {
                const normalized = normalizeSkill(skill);
                return !Array.from(jobscanAllSkills).some(js => 
                    normalized.includes(js) || js.includes(normalized)
                );
            });
            
            const ourUniqueSoft = parsed.softSkills.filter(skill => {
                const normalized = normalizeSkill(skill);
                return !Array.from(jobscanAllSkills).some(js => 
                    normalized.includes(js) || js.includes(normalized)
                );
            });
            
            if (ourUniqueHard.length > 0) {
                console.log(`Hard Skills (${ourUniqueHard.length}):`);
                ourUniqueHard.forEach(skill => console.log(`   - ${skill}`));
            }
            
            if (ourUniqueSoft.length > 0) {
                console.log(`\nSoft Skills (${ourUniqueSoft.length}):`);
                ourUniqueSoft.forEach(skill => console.log(`   - ${skill}`));
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log('✨ Comparison complete!');
        console.log('='.repeat(60));

    } catch (error: any) {
        console.error('\n❌ COMPARISON FAILED');
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

// Run the comparison
compareSkills()
    .then(() => {
        console.log('\n✅ Script completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Script failed:', error);
        process.exit(1);
    });

