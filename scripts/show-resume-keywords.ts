#!/usr/bin/env tsx
/**
 * Show keywords extracted from job description in the latest generated resume
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

async function showKeywords() {
    const company = process.argv[2] || 'Snap';
    
    console.log(`🔍 Finding latest resume for ${company}...\n`);

    // Find the job
    const { data: jobs } = await supabaseAdmin
        .from('jobs')
        .select('id, title, company')
        .ilike('company', `%${company}%`)
        .order('created_at', { ascending: false })
        .limit(1);

    if (!jobs || jobs.length === 0) {
        console.log('❌ No jobs found');
        return;
    }

    const job = jobs[0];
    console.log(`📋 Job: ${job.title} at ${job.company}\n`);

    // Find latest resume for this job
    const { data: resumes } = await supabaseAdmin
        .from('resume_versions')
        .select('id, content, created_at, jobs!inner(title, company)')
        .eq('job_id', job.id)
        .order('created_at', { ascending: false })
        .limit(1);
    
    // Also get ATS analysis
    const resumeId = resumes?.[0]?.id;
    let atsAnalysis = null;
    if (resumeId) {
        const { data: atsScores } = await supabaseAdmin
            .from('ats_scores')
            .select('analysis')
            .eq('resume_version_id', resumeId)
            .order('created_at', { ascending: false })
            .limit(1);
        
        if (atsScores && atsScores.length > 0) {
            atsAnalysis = atsScores[0].analysis;
        }
    }

    if (!resumes || resumes.length === 0) {
        console.log('❌ No resumes found for this job');
        return;
    }

    const resume = resumes[0];
    const content = resume.content as any;

    console.log(`📄 Resume ID: ${resume.id}`);
    console.log(`   Created: ${resume.created_at}\n`);

    // Check if keywords are stored in metadata or content
    if (content.keywords) {
        console.log('📊 KEYWORDS FOUND IN RESUME:\n');
        console.log('Keywords:', content.keywords);
    } else if (content.metadata?.keywords) {
        console.log('📊 KEYWORDS FOUND IN METADATA:\n');
        console.log('Keywords:', content.metadata.keywords);
    } else {
        console.log('📊 RESUME CONTENT STRUCTURE:\n');
        console.log('Available keys:', Object.keys(content));
        
        // Check for parsed JD data
        if (content.parsedJD) {
            console.log('\n📋 PARSED JOB DESCRIPTION DATA:\n');
            const parsedJD = content.parsedJD;
            if (parsedJD.hardSkills) {
                console.log(`Hard Skills (${parsedJD.hardSkills.length}):`);
                parsedJD.hardSkills.forEach((s: string, i: number) => 
                    console.log(`   ${i + 1}. ${s}`)
                );
            }
            if (parsedJD.softSkills) {
                console.log(`\nSoft Skills (${parsedJD.softSkills.length}):`);
                parsedJD.softSkills.forEach((s: string, i: number) => 
                    console.log(`   ${i + 1}. ${s}`)
                );
            }
            if (parsedJD.keyPhrases) {
                console.log(`\nKey Phrases (${parsedJD.keyPhrases.length}):`);
                parsedJD.keyPhrases.forEach((s: string, i: number) => 
                    console.log(`   ${i + 1}. ${s}`)
                );
            }
        }
        
        // Show skills from resume
        if (content.skills) {
            console.log(`\n📝 SKILLS IN RESUME (${content.skills.length}):`);
            content.skills.forEach((s: string, i: number) => 
                console.log(`   ${i + 1}. ${s}`)
            );
        }
    }

    // Show ATS analysis keywords
    if (atsAnalysis) {
        console.log('\n\n📊 ATS KEYWORD ANALYSIS:\n');
        
        if (atsAnalysis.matchedKeywords && Array.isArray(atsAnalysis.matchedKeywords)) {
            console.log(`✅ MATCHED KEYWORDS (${atsAnalysis.matchedKeywords.length}):`);
            atsAnalysis.matchedKeywords.forEach((kw: string, i: number) => 
                console.log(`   ${i + 1}. ${kw}`)
            );
        }
        
        if (atsAnalysis.missingKeywords && Array.isArray(atsAnalysis.missingKeywords)) {
            console.log(`\n❌ MISSING KEYWORDS (${atsAnalysis.missingKeywords.length}):`);
            atsAnalysis.missingKeywords.forEach((kw: string, i: number) => 
                console.log(`   ${i + 1}. ${kw}`)
            );
        }
        
        if (atsAnalysis.missing_keywords && Array.isArray(atsAnalysis.missing_keywords)) {
            console.log(`\n❌ MISSING KEYWORDS (${atsAnalysis.missing_keywords.length}):`);
            atsAnalysis.missing_keywords.forEach((kw: string, i: number) => 
                console.log(`   ${i + 1}. ${kw}`)
            );
        }
    } else {
        console.log('\n⚠️  No ATS analysis found for this resume');
    }

    console.log('\n' + '='.repeat(60));
}

showKeywords().catch(console.error);

