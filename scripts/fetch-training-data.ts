#!/usr/bin/env npx tsx
/**
 * Fetch Training Data Script
 * 
 * Downloads and caches training data from HuggingFace datasets.
 * 
 * Usage:
 *   npx tsx scripts/fetch-training-data.ts [options]
 * 
 * Options:
 *   --test          Run in test mode (limit 10 records)
 *   --limit N       Maximum records to fetch (default: 100)
 *   --resumes       Fetch resume data only
 *   --jobs          Fetch job description data only
 *   --output DIR    Output directory (default: training/cache)
 *   --stats         Show statistics only, don't save files
 */

import { getDatasetLoader, loadResumes, loadJobDescriptions } from '../lib/training/dataset-loader';
import type { TrainingResume, JobDescription } from '../lib/training/dataset-schema';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// CLI Arguments
// ============================================================================

interface Args {
    test: boolean;
    limit: number;
    resumes: boolean;
    jobs: boolean;
    output: string;
    stats: boolean;
}

function parseArgs(): Args {
    const args: Args = {
        test: false,
        limit: 100,
        resumes: false,
        jobs: false,
        output: 'training/cache',
        stats: false,
    };

    const argv = process.argv.slice(2);
    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        switch (arg) {
            case '--test':
                args.test = true;
                args.limit = 10;
                break;
            case '--limit':
                args.limit = parseInt(argv[++i], 10) || 100;
                break;
            case '--resumes':
                args.resumes = true;
                break;
            case '--jobs':
                args.jobs = true;
                break;
            case '--output':
                args.output = argv[++i] || 'training/cache';
                break;
            case '--stats':
                args.stats = true;
                break;
        }
    }

    // If neither specified, fetch both
    if (!args.resumes && !args.jobs) {
        args.resumes = true;
        args.jobs = true;
    }

    return args;
}

// ============================================================================
// Main Functions
// ============================================================================

async function fetchResumes(limit: number): Promise<TrainingResume[]> {
    console.log(`\nFetching up to ${limit} resumes from HuggingFace...`);

    const startTime = Date.now();
    const resumes = await loadResumes(limit);
    const elapsed = (Date.now() - startTime) / 1000;

    console.log(`✓ Fetched ${resumes.length} resumes in ${elapsed.toFixed(1)}s`);

    return resumes;
}

async function fetchJobDescriptions(limit: number): Promise<JobDescription[]> {
    console.log(`\nFetching up to ${limit} job descriptions from HuggingFace...`);

    const startTime = Date.now();
    const jds = await loadJobDescriptions(limit);
    const elapsed = (Date.now() - startTime) / 1000;

    console.log(`✓ Fetched ${jds.length} job descriptions in ${elapsed.toFixed(1)}s`);

    return jds;
}

function saveToFile(data: unknown, filePath: string): void {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`✓ Saved to ${filePath}`);
}

function showResumeStats(resumes: TrainingResume[]): void {
    console.log('\n=== Resume Dataset Statistics ===');
    console.log(`Total records: ${resumes.length}`);

    // Category distribution
    const categories: Record<string, number> = {};
    for (const r of resumes) {
        const cat = r.category || 'Unknown';
        categories[cat] = (categories[cat] || 0) + 1;
    }

    console.log('\nCategories:');
    const sortedCats = Object.entries(categories)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
    for (const [cat, count] of sortedCats) {
        console.log(`  ${cat}: ${count}`);
    }

    // Quality score distribution
    const qualityScores = resumes.map(r => r.qualityScore || 0);
    const avgQuality = qualityScores.length > 0
        ? qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length
        : 0;
    console.log(`\nAverage quality score: ${avgQuality.toFixed(3)}`);

    // Experience count
    const expCounts = resumes.map(r => r.experience.length);
    const avgExp = expCounts.length > 0
        ? expCounts.reduce((a, b) => a + b, 0) / expCounts.length
        : 0;
    console.log(`Average experiences per resume: ${avgExp.toFixed(1)}`);

    // Skills count
    const skillCounts = resumes.map(r => r.skills.length);
    const avgSkills = skillCounts.length > 0
        ? skillCounts.reduce((a, b) => a + b, 0) / skillCounts.length
        : 0;
    console.log(`Average skills per resume: ${avgSkills.toFixed(1)}`);
}

function showJobDescriptionStats(jds: JobDescription[]): void {
    console.log('\n=== Job Description Dataset Statistics ===');
    console.log(`Total records: ${jds.length}`);

    // Domain distribution
    const domains: Record<string, number> = {};
    for (const jd of jds) {
        const domain = jd.domain || 'Unknown';
        domains[domain] = (domains[domain] || 0) + 1;
    }

    console.log('\nDomains:');
    const sortedDomains = Object.entries(domains)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
    for (const [domain, count] of sortedDomains) {
        console.log(`  ${domain}: ${count}`);
    }

    // Experience level distribution
    const expLevels: Record<string, number> = {};
    for (const jd of jds) {
        const level = jd.experienceYears || 'Not specified';
        expLevels[level] = (expLevels[level] || 0) + 1;
    }

    console.log('\nExperience levels:');
    const sortedLevels = Object.entries(expLevels)
        .sort((a, b) => b[1] - a[1]);
    for (const [level, count] of sortedLevels) {
        console.log(`  ${level}: ${count}`);
    }

    // Skills per JD
    const skillCounts = jds.map(jd => (jd.requiredSkills?.length || 0));
    const avgSkills = skillCounts.length > 0
        ? skillCounts.reduce((a, b) => a + b, 0) / skillCounts.length
        : 0;
    console.log(`\nAverage required skills per JD: ${avgSkills.toFixed(1)}`);
}

// ============================================================================
// Main
// ============================================================================

async function main(): Promise<void> {
    console.log('=== Training Data Fetcher ===');

    const args = parseArgs();
    console.log('\nOptions:', args);

    try {
        if (args.resumes) {
            const resumes = await fetchResumes(args.limit);
            showResumeStats(resumes);

            if (!args.stats && resumes.length > 0) {
                const outputPath = path.join(args.output, 'resumes.json');
                saveToFile(resumes, outputPath);
            }
        }

        if (args.jobs) {
            const jds = await fetchJobDescriptions(args.limit);
            showJobDescriptionStats(jds);

            if (!args.stats && jds.length > 0) {
                const outputPath = path.join(args.output, 'job-descriptions.json');
                saveToFile(jds, outputPath);
            }
        }

        console.log('\n✓ Done!');
    } catch (error) {
        console.error('\n✗ Error:', error);
        process.exit(1);
    }
}

main();
