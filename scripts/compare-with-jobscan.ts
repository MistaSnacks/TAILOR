#!/usr/bin/env tsx
/**
 * Compare our extracted keywords with Jobscan's analysis
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

// Jobscan's hard skills
const JOBCAN_HARD_SKILLS = [
    'Snapchat', 'Tooling', 'Machine learning', 'Data visualization software',
    'Operational Support', 'Process development', 'Content Moderation',
    'Safety operations', 'Analytical skills', 'Business Insights',
    'Identify trends', 'Large data sets', 'Computer vision', 'Advanced excel',
    'Public policy', 'Management', 'Research', 'Workflow', 'Grafana',
    'Looker', 'Syntax', 'Flex'
];

function normalize(s: string): string {
    return s.toLowerCase().trim();
}

function findMatch(ourSkill: string, jobscanSkill: string): boolean {
    const our = normalize(ourSkill);
    const js = normalize(jobscanSkill);

    // Exact match
    if (our === js) return true;

    // Contains match
    if (our.includes(js) || js.includes(our)) return true;

    // Word match for multi-word skills
    const ourWords = our.split(/\s+/);
    const jsWords = js.split(/\s+/);

    // Check if all jobscan words appear in our skill
    return jsWords.every(jsWord =>
        ourWords.some(ourWord => ourWord.includes(jsWord) || jsWord.includes(ourWord))
    );
}

async function compare() {
    const company = process.argv[2] || 'Snap';

    // Get job
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

    // Get latest resume
    const { data: resumes } = await supabaseAdmin
        .from('resume_versions')
        .select('id, content')
        .eq('job_id', job.id)
        .order('created_at', { ascending: false })
        .limit(1);

    if (!resumes || resumes.length === 0) {
        console.log('❌ No resumes found');
        return;
    }

    const resume = resumes[0];
    const content = resume.content as any;
    const ourSkills = content.skills || [];

    // Get ATS analysis
    const { data: atsScores } = await supabaseAdmin
        .from('ats_scores')
        .select('analysis')
        .eq('resume_version_id', resume.id)
        .order('created_at', { ascending: false })
        .limit(1);

    const atsAnalysis = atsScores?.[0]?.analysis;
    const matchedKeywords = atsAnalysis?.matchedKeywords || [];
    const missingKeywords = atsAnalysis?.missingKeywords || [];

    console.log('🔍 COMPARISON: Our Skills vs Jobscan\n');
    console.log(`Job: ${job.title} at ${job.company}\n`);

    console.log('📊 JOBCAN HARD SKILLS ANALYSIS:\n');

    const matches: string[] = [];
    const missing: string[] = [];

    for (const jobscanSkill of JOBCAN_HARD_SKILLS) {
        const found = ourSkills.some((ourSkill: string) => findMatch(ourSkill, jobscanSkill)) ||
            matchedKeywords.some((kw: string) => findMatch(kw, jobscanSkill));

        if (found) {
            const ourMatch = ourSkills.find((s: string) => findMatch(s, jobscanSkill)) ||
                matchedKeywords.find((kw: string) => findMatch(kw, jobscanSkill));
            console.log(`   ✅ ${jobscanSkill}`);
            console.log(`      → Matched: ${ourMatch}`);
            matches.push(jobscanSkill);
        } else {
            console.log(`   ❌ ${jobscanSkill} - MISSING`);
            missing.push(jobscanSkill);
        }
    }

    console.log(`\n📈 SUMMARY:`);
    console.log(`   Matched: ${matches.length}/${JOBCAN_HARD_SKILLS.length} (${((matches.length / JOBCAN_HARD_SKILLS.length) * 100).toFixed(1)}%)`);
    console.log(`   Missing: ${missing.length}/${JOBCAN_HARD_SKILLS.length}`);

    if (missing.length > 0) {
        console.log(`\n❌ MISSING SKILLS:`);
        missing.forEach(skill => console.log(`   - ${skill}`));
    }

    console.log(`\n📝 OUR SKILLS (${ourSkills.length}):`);
    ourSkills.forEach((s: string, i: number) =>
        console.log(`   ${i + 1}. ${s}`)
    );

    if (matchedKeywords.length > 0) {
        console.log(`\n✅ MATCHED KEYWORDS FROM ATS (${matchedKeywords.length}):`);
        matchedKeywords.forEach((kw: string, i: number) =>
            console.log(`   ${i + 1}. ${kw}`)
        );
    }

    console.log('\n' + '='.repeat(60));
}

compare().catch(console.error);


