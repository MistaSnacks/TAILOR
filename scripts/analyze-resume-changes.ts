#!/usr/bin/env tsx
/**
 * Analyze what changes the critic and validator made to the latest resume
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

async function analyzeChanges() {
    const userId = process.argv[2];
    const jobId = process.argv[3];

    if (!userId) {
        console.error('❌ User ID required');
        console.log('Usage: npx tsx scripts/analyze-resume-changes.ts <userId> [jobId]');
        process.exit(1);
    }

    console.log(`🔍 Analyzing latest resume changes for user: ${userId}\n`);

    try {
        // Get latest resume
        let query = supabaseAdmin
            .from('resume_versions')
            .select('id, content, created_at, jobs!inner(title, company)')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(1);

        if (jobId) {
            query = query.eq('job_id', jobId);
        }

        const { data: resumes } = await query;

        if (!resumes || resumes.length === 0) {
            console.log('❌ No resumes found');
            return;
        }

        const resume = resumes[0];
        const content = resume.content as any;

        console.log(`📄 Resume ID: ${resume.id}`);
        const job = Array.isArray(resume.jobs) ? resume.jobs[0] : resume.jobs;
        console.log(`   Job: ${job.title} at ${job.company}`);
        console.log(`   Created: ${resume.created_at}\n`);

        // Check for critic metadata
        if (content.critic) {
            console.log('📊 CRITIC ANALYSIS:\n');
            const critic = content.critic;

            if (critic.score) {
                console.log('   Scores:');
                console.log(`      Overall: ${critic.score.overall || 0}/100`);
                console.log(`      Keyword Coverage: ${critic.score.keywordCoverage || 0}/100`);
                console.log(`      Semantic Fit: ${critic.score.semanticFit || 0}/100`);
                console.log(`      Metric Density: ${critic.score.metricDensity || 0}/100`);
            }

            if (critic.issues && Array.isArray(critic.issues)) {
                console.log(`\n   Issues Found: ${critic.issues.length}`);

                const issuesByType: Record<string, number> = {};
                critic.issues.forEach((issue: any) => {
                    const type = issue.issueType || 'unknown';
                    issuesByType[type] = (issuesByType[type] || 0) + 1;
                });

                console.log('\n   Issues by Type:');
                Object.entries(issuesByType).forEach(([type, count]) => {
                    console.log(`      ${type}: ${count}`);
                });

                console.log('\n   Detailed Issues (first 10):');
                critic.issues.slice(0, 10).forEach((issue: any, i: number) => {
                    console.log(`\n   ${i + 1}. ${issue.issueType || 'unknown'}`);
                    console.log(`      Experience: ${issue.experience_id || 'N/A'}`);
                    console.log(`      Bullet Index: ${issue.bullet_index >= 0 ? issue.bullet_index : 'N/A'}`);
                    console.log(`      Explanation: ${issue.explanation || 'N/A'}`);
                    if (issue.suggested_rewrite) {
                        console.log(`      Suggested Rewrite: "${issue.suggested_rewrite.substring(0, 100)}..."`);
                    }
                });

                if (critic.issues.length > 10) {
                    console.log(`\n   ... and ${critic.issues.length - 10} more issues`);
                }
            } else {
                console.log('   No issues found');
            }
        } else {
            console.log('⚠️  No critic metadata found in resume');
        }

        // Check for validator metadata
        if (content.validator) {
            console.log('\n\n🔍 VALIDATOR ANALYSIS:\n');
            const validator = content.validator;

            console.log('   Summary of Changes:');
            console.log(`      Summary Changed: ${validator.summaryChanged ? '✅ Yes' : '❌ No'}`);
            console.log(`      Skills Changed: ${validator.skillsChanged ? '✅ Yes' : '❌ No'}`);
            console.log(`      Skills Reordered: ${validator.skillsReordered ? '✅ Yes' : '❌ No'}`);
            console.log(`      Experience Bullets Changed: ${validator.experienceBulletsChanged || 0}`);

            if (validator.changes && Array.isArray(validator.changes)) {
                console.log(`\n   Total Changes: ${validator.changes.length}`);

                const changesBySection: Record<string, number> = {};
                const changesByType: Record<string, number> = {};

                validator.changes.forEach((change: any) => {
                    const section = change.section || 'unknown';
                    const type = change.type || 'unknown';
                    changesBySection[section] = (changesBySection[section] || 0) + 1;
                    changesByType[type] = (changesByType[type] || 0) + 1;
                });

                console.log('\n   Changes by Section:');
                Object.entries(changesBySection).forEach(([section, count]) => {
                    console.log(`      ${section}: ${count}`);
                });

                console.log('\n   Changes by Type:');
                Object.entries(changesByType).forEach(([type, count]) => {
                    console.log(`      ${type}: ${count}`);
                });

                console.log('\n   Detailed Changes:');
                validator.changes.slice(0, 15).forEach((change: any, i: number) => {
                    console.log(`\n   ${i + 1}. ${change.type || 'unknown'} - ${change.section || 'unknown'}`);
                    console.log(`      Description: ${change.description || 'N/A'}`);
                    if (change.before) {
                        console.log(`      Before: "${change.before}..."`);
                    }
                    if (change.after) {
                        console.log(`      After: "${change.after}..."`);
                    }
                    if (change.experienceIndex !== undefined) {
                        console.log(`      Experience Index: ${change.experienceIndex}`);
                    }
                    if (change.bulletIndex !== undefined) {
                        console.log(`      Bullet Index: ${change.bulletIndex}`);
                    }
                });

                if (validator.changes.length > 15) {
                    console.log(`\n   ... and ${validator.changes.length - 15} more changes`);
                }
            }

            if (validator.jdKeywordsAdded && validator.jdKeywordsAdded.length > 0) {
                console.log(`\n   ✅ JD Keywords Added (${validator.jdKeywordsAdded.length}):`);
                validator.jdKeywordsAdded.slice(0, 10).forEach((keyword: string) => {
                    console.log(`      - ${keyword}`);
                });
                if (validator.jdKeywordsAdded.length > 10) {
                    console.log(`      ... and ${validator.jdKeywordsAdded.length - 10} more`);
                }
            }

            if (validator.jdKeywordsMissing && validator.jdKeywordsMissing.length > 0) {
                console.log(`\n   ⚠️  JD Keywords Still Missing (${validator.jdKeywordsMissing.length}):`);
                validator.jdKeywordsMissing.slice(0, 10).forEach((keyword: string) => {
                    console.log(`      - ${keyword}`);
                });
                if (validator.jdKeywordsMissing.length > 10) {
                    console.log(`      ... and ${validator.jdKeywordsMissing.length - 10} more`);
                }
            }
        } else {
            console.log('\n⚠️  No validator metadata found in resume');
            console.log('   This resume may have been generated before validator tracking was added');
        }

        // Show final resume content summary
        console.log('\n\n📝 FINAL RESUME CONTENT SUMMARY:\n');

        if (content.summary) {
            console.log(`Summary (${content.summary.length} chars):`);
            console.log(`   "${content.summary.substring(0, 200)}..."`);
        }

        if (content.skills && Array.isArray(content.skills)) {
            console.log(`\nSkills (${content.skills.length}):`);
            content.skills.slice(0, 15).forEach((skill: string, i: number) => {
                console.log(`   ${i + 1}. ${skill}`);
            });
            if (content.skills.length > 15) {
                console.log(`   ... and ${content.skills.length - 15} more`);
            }
        }

        if (content.experience && Array.isArray(content.experience)) {
            console.log(`\nExperiences (${content.experience.length}):`);
            content.experience.forEach((exp: any, i: number) => {
                console.log(`\n   ${i + 1}. ${exp.title} at ${exp.company}`);
                if (exp.bullets && Array.isArray(exp.bullets)) {
                    console.log(`      Bullets: ${exp.bullets.length}`);
                    exp.bullets.slice(0, 2).forEach((bullet: string, j: number) => {
                        console.log(`         ${j + 1}. ${bullet.substring(0, 80)}...`);
                    });
                    if (exp.bullets.length > 2) {
                        console.log(`         ... and ${exp.bullets.length - 2} more`);
                    }
                }
            });
        }

        // Check ATS analysis for keyword matching
        const { data: atsScores } = await supabaseAdmin
            .from('ats_scores')
            .select('score, keyword_match, semantic_similarity, analysis')
            .eq('resume_version_id', resume.id)
            .order('created_at', { ascending: false })
            .limit(1);

        if (atsScores && atsScores.length > 0) {
            const ats = atsScores[0];
            console.log('\n\n📈 ATS SCORE ANALYSIS:\n');
            console.log(`   Overall Score: ${ats.score}/100`);
            console.log(`   Keyword Match: ${ats.keyword_match}/100`);
            console.log(`   Semantic Similarity: ${ats.semantic_similarity}/100`);

            if (ats.analysis) {
                const analysis = ats.analysis as any;
                if (analysis.matchedKeywords && Array.isArray(analysis.matchedKeywords)) {
                    console.log(`\n   Matched Keywords: ${analysis.matchedKeywords.length}`);
                    analysis.matchedKeywords.slice(0, 10).forEach((kw: string) => {
                        console.log(`      - ${kw}`);
                    });
                }
                if (analysis.missingKeywords && Array.isArray(analysis.missingKeywords)) {
                    console.log(`\n   Missing Keywords: ${analysis.missingKeywords.length}`);
                    analysis.missingKeywords.slice(0, 10).forEach((kw: string) => {
                        console.log(`      - ${kw}`);
                    });
                }
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log('✨ Analysis complete!');
        console.log('='.repeat(60));

    } catch (error: any) {
        console.error('\n❌ ANALYSIS FAILED');
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

analyzeChanges().catch(console.error);

