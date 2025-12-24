#!/usr/bin/env npx tsx
/**
 * Generate ATS Ground Truth Data
 * 
 * Creates training pairs with ATS scores as ground truth labels.
 * 
 * Usage:
 *   npx tsx scripts/generate-ats-ground-truth.ts [options]
 * 
 * Options:
 *   --pairs N       Number of pairs per resume (default: 3)
 *   --resumes N     Number of resumes to use (default: 50)
 *   --jds N         Number of job descriptions to use (default: 100)
 *   --output FILE   Output file path (default: training/cache/ats-ground-truth.json)
 *   --min-score N   Minimum ATS score to include (default: 0)
 *   --delay N       Delay between scoring calls in ms (default: 100)
 */

import { AtsGroundTruthGenerator } from '../lib/training/ats-ground-truth';
import type { GenerationStats } from '../lib/training/ats-ground-truth';

// ============================================================================
// CLI Arguments
// ============================================================================

interface Args {
    pairs: number;
    resumes: number;
    jds: number;
    output: string;
    minScore: number;
    delay: number;
}

function parseArgs(): Args {
    const args: Args = {
        pairs: 3,
        resumes: 50,
        jds: 100,
        output: 'training/cache/ats-ground-truth.json',
        minScore: 0,
        delay: 100,
    };

    const argv = process.argv.slice(2);
    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        switch (arg) {
            case '--pairs': {
                const parsed = parseInt(argv[++i], 10);
                if (isNaN(parsed) || parsed <= 0) {
                    console.error(`❌ Invalid value for --pairs: must be a positive integer`);
                    process.exit(1);
                }
                args.pairs = parsed;
                break;
            }
            case '--resumes': {
                const parsed = parseInt(argv[++i], 10);
                if (isNaN(parsed) || parsed <= 0) {
                    console.error(`❌ Invalid value for --resumes: must be a positive integer`);
                    process.exit(1);
                }
                args.resumes = parsed;
                break;
            }
            case '--jds': {
                const parsed = parseInt(argv[++i], 10);
                if (isNaN(parsed) || parsed <= 0) {
                    console.error(`❌ Invalid value for --jds: must be a positive integer`);
                    process.exit(1);
                }
                args.jds = parsed;
                break;
            }
            case '--output':
                args.output = argv[++i] || args.output;
                break;
            case '--min-score': {
                const parsed = parseInt(argv[++i], 10);
                if (isNaN(parsed) || parsed < 0) {
                    console.error(`❌ Invalid value for --min-score: must be a non-negative integer`);
                    process.exit(1);
                }
                args.minScore = parsed;
                break;
            }
            case '--delay': {
                const parsed = parseInt(argv[++i], 10);
                if (isNaN(parsed) || parsed <= 0) {
                    console.error(`❌ Invalid value for --delay: must be a positive integer`);
                    process.exit(1);
                }
                args.delay = parsed;
                break;
            }
        }
    }

    return args;
}

// ============================================================================
// Display Functions
// ============================================================================

function displayStats(stats: GenerationStats): void {
    console.log('\n=== Generation Statistics ===');
    console.log(`Total pairs: ${stats.totalPairs}`);
    console.log(`Average ATS score: ${stats.avgScore}%`);
    console.log(`Good matches (≥70%): ${stats.goodMatchCount} (${((stats.goodMatchCount / stats.totalPairs) * 100).toFixed(1)}%)`);
    console.log(`Processing time: ${(stats.processingTimeMs / 1000).toFixed(1)}s`);

    console.log('\nScore distribution:');
    for (const [bucket, count] of Object.entries(stats.scoreDistribution)) {
        const bar = '█'.repeat(Math.ceil(count / 2));
        console.log(`  ${bucket.padEnd(8)}: ${count.toString().padStart(4)} ${bar}`);
    }
}

// ============================================================================
// Main
// ============================================================================

async function main(): Promise<void> {
    console.log('=== ATS Ground Truth Generator ===\n');

    const args = parseArgs();
    console.log('Options:', args);

    try {
        const generator = new AtsGroundTruthGenerator();

        // Load data
        await generator.loadData({
            resumeLimit: args.resumes,
            jdLimit: args.jds,
        });

        // Generate dataset
        const stats = await generator.generateDataset(args.output, {
            pairsPerResume: args.pairs,
            minScore: args.minScore,
            delayMs: args.delay,
        });

        // Display results
        displayStats(stats);

        console.log('\n✓ Done!');
    } catch (error) {
        console.error('\n✗ Error:', error);
        process.exit(1);
    }
}

main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
