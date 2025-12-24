/**
 * ATS Ground Truth Generator
 * 
 * Creates training pairs with ATS scores as ground truth labels.
 * Uses the existing ATS scorer to generate scores for resume+JD pairs.
 */

import { runAtsScore, type AtsScoreResult } from '../ats-scorer';
import {
    type TrainingResume,
    type JobDescription,
    type TrainingPair,
    TrainingPairSchema,
} from './dataset-schema';
import { getDatasetLoader } from './dataset-loader';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// Types
// ============================================================================

export interface AtsGroundTruth {
    pairId: string;
    resumeCategory: string;
    jdDomain: string;
    atsScore: number;
    keywordCoverage: number;
    criticalMatched: number;
    criticalTotal: number;
    importantMatched: number;
    importantTotal: number;
    matchedKeywords: string[];
    missingKeywords: string[];
    isGoodMatch: boolean;  // Score >= 70
    scoreInterpretation: string;
}

export interface GroundTruthPair extends TrainingPair {
    groundTruth: AtsGroundTruth;
}

export interface GenerationOptions {
    resumeLimit?: number;
    jdLimit?: number;
    pairsPerResume?: number;
    minScore?: number;  // Filter out low-quality pairs
    maxScore?: number;  // Filter out too-easy pairs
    batchSize?: number;
    delayMs?: number;   // Rate limiting
}

export interface GenerationStats {
    totalPairs: number;
    avgScore: number;
    scoreDistribution: Record<string, number>;
    goodMatchCount: number;
    processingTimeMs: number;
}

// ============================================================================
// Resume Text Formatter (for ATS scoring)
// ============================================================================

function formatResumeForAts(resume: TrainingResume): string {
    const parts: string[] = [];

    // Summary
    if (resume.summary) {
        parts.push('PROFESSIONAL SUMMARY');
        parts.push(resume.summary);
        parts.push('');
    }

    // Experience
    if (resume.experience?.length > 0) {
        parts.push('PROFESSIONAL EXPERIENCE');
        for (const exp of resume.experience) {
            parts.push(`${exp.title} | ${exp.company}`);
            if (exp.location) parts.push(exp.location);
            if (exp.startDate || exp.endDate) {
                parts.push(`${exp.startDate || ''} - ${exp.endDate || 'Present'}`);
            }
            for (const bullet of exp.bullets || []) {
                parts.push(`• ${bullet}`);
            }
            parts.push('');
        }
    }

    // Skills
    if (resume.skills?.length > 0) {
        parts.push('SKILLS');
        parts.push(resume.skills.join(', '));
        parts.push('');
    }

    // Education
    if (resume.education && resume.education.length > 0) {
        parts.push('EDUCATION');
        for (const edu of resume.education) {
            const degree = [edu.degree, edu.field].filter(Boolean).join(' in ');
            parts.push(`${degree} | ${edu.institution}`);
            if (edu.endDate) parts.push(edu.endDate);
        }
        parts.push('');
    }

    // Certifications
    if (resume.certifications && resume.certifications.length > 0) {
        parts.push('CERTIFICATIONS');
        for (const cert of resume.certifications) {
            parts.push(`${cert.name}${cert.issuer ? ` - ${cert.issuer}` : ''}${cert.date ? ` (${cert.date})` : ''}`);
        }
    }

    return parts.join('\n');
}

// ============================================================================
// Ground Truth Generator
// ============================================================================

export class AtsGroundTruthGenerator {
    private resumes: TrainingResume[] = [];
    private jobDescriptions: JobDescription[] = [];

    /**
     * Load data from cache or fetch fresh
     */
    async loadData(options: { resumeLimit?: number; jdLimit?: number } = {}): Promise<void> {
        const { resumeLimit = 100, jdLimit = 200 } = options;

        // Try to load from cache first
        const cacheDir = path.join(process.cwd(), 'training', 'cache');
        const resumeCachePath = path.join(cacheDir, 'resumes.json');
        const jdCachePath = path.join(cacheDir, 'job-descriptions.json');

        if (fs.existsSync(resumeCachePath)) {
            console.log('Loading resumes from cache...');
            try {
                const cached = JSON.parse(fs.readFileSync(resumeCachePath, 'utf-8'));
                this.resumes = cached.slice(0, resumeLimit);
                console.log(`Loaded ${this.resumes.length} resumes from cache`);
            } catch (parseError) {
                console.warn('Failed to parse resume cache, fetching fresh data...');
                console.log('Removing corrupt cache file and fetching fresh data from HuggingFace...');
                try {
                    fs.unlinkSync(resumeCachePath);
                } catch (unlinkError) {
                    console.warn('Failed to remove corrupt cache file:', unlinkError);
                }
                const loader = getDatasetLoader();
                for await (const resume of loader.loadResumes({ limit: resumeLimit })) {
                    this.resumes.push(resume);
                }
                console.log(`Fetched ${this.resumes.length} resumes`);
            }
        } else {
            console.log('Fetching resumes from HuggingFace...');
            const loader = getDatasetLoader();
            for await (const resume of loader.loadResumes({ limit: resumeLimit })) {
                this.resumes.push(resume);
            }
            console.log(`Fetched ${this.resumes.length} resumes`);
        }

        if (fs.existsSync(jdCachePath)) {
            console.log('Loading job descriptions from cache...');
            try {
                const cached = JSON.parse(fs.readFileSync(jdCachePath, 'utf-8'));
                this.jobDescriptions = cached.slice(0, jdLimit);
                console.log(`Loaded ${this.jobDescriptions.length} job descriptions from cache`);
            } catch (parseError) {
                console.error('Failed to parse job descriptions cache:', {
                    path: jdCachePath,
                    error: parseError instanceof Error ? parseError.message : String(parseError),
                });
                console.log('Removing corrupt cache file and fetching fresh data from HuggingFace...');
                try {
                    fs.unlinkSync(jdCachePath);
                } catch (unlinkError) {
                    console.warn('Failed to remove corrupt cache file:', unlinkError);
                }
                const loader = getDatasetLoader();
                for await (const jd of loader.loadJobDescriptions({ limit: jdLimit })) {
                    this.jobDescriptions.push(jd);
                }
                console.log(`Fetched ${this.jobDescriptions.length} job descriptions`);
            }
        } else {
            console.log('Fetching job descriptions from HuggingFace...');
            const loader = getDatasetLoader();
            for await (const jd of loader.loadJobDescriptions({ limit: jdLimit })) {
                this.jobDescriptions.push(jd);
            }
            console.log(`Fetched ${this.jobDescriptions.length} job descriptions`);
        }
    }

    /**
     * Generate ground truth pairs with ATS scores
     */
    async *generateGroundTruthPairs(
        options: GenerationOptions = {}
    ): AsyncGenerator<GroundTruthPair> {
        const {
            pairsPerResume = 3,
            minScore = 0,
            maxScore = 100,
            delayMs = 100,
        } = options;

        if (this.resumes.length === 0 || this.jobDescriptions.length === 0) {
            throw new Error('Data not loaded. Call loadData() first.');
        }

        let pairId = 0;
        const jdPool = [...this.jobDescriptions];

        for (const resume of this.resumes) {
            // Skip resumes with very low quality (no experience or skills)
            if (resume.experience.length === 0 && resume.skills.length === 0) {
                continue;
            }

            // Select random JDs for this resume
            const selectedJds = selectRandomItems(jdPool, pairsPerResume);

            for (const jd of selectedJds) {
                try {
                    const resumeText = formatResumeForAts(resume);

                    // Run ATS scoring
                    const atsResult = await runAtsScore(jd.description, resumeText, resume.skills);

                    // Extract ground truth
                    const groundTruth = extractGroundTruth(
                        `pair-${++pairId}`,
                        resume,
                        jd,
                        atsResult
                    );

                    // Apply score filters
                    if (groundTruth.atsScore < minScore || groundTruth.atsScore > maxScore) {
                        continue;
                    }

                    const pair: GroundTruthPair = {
                        id: groundTruth.pairId,
                        resume,
                        jobDescription: jd,
                        expectedAtsScore: groundTruth.atsScore,
                        matchedKeywords: groundTruth.matchedKeywords,
                        missingKeywords: groundTruth.missingKeywords,
                        isGoodMatch: groundTruth.isGoodMatch,
                        groundTruth,
                    };

                    yield pair;

                    // Rate limiting
                    if (delayMs > 0) {
                        await sleep(delayMs);
                    }
                } catch (error) {
                    console.error(`Error scoring pair ${pairId}:`, error);
                    continue;
                }
            }
        }
    }

    /**
     * Generate and save ground truth dataset
     */
    async generateDataset(
        outputPath: string,
        options: GenerationOptions = {}
    ): Promise<GenerationStats> {
        const startTime = Date.now();
        const pairs: GroundTruthPair[] = [];
        const scores: number[] = [];

        console.log('Generating ground truth pairs...');

        for await (const pair of this.generateGroundTruthPairs(options)) {
            pairs.push(pair);
            scores.push(pair.groundTruth.atsScore);

            if (pairs.length % 10 === 0) {
                console.log(`Generated ${pairs.length} pairs...`);
            }
        }

        // Calculate statistics
        const stats = calculateStats(pairs, scores, Date.now() - startTime);

        // Save to file
        const outputDir = path.dirname(outputPath);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        fs.writeFileSync(outputPath, JSON.stringify({
            metadata: {
                generatedAt: new Date().toISOString(),
                stats,
            },
            pairs,
        }, null, 2));

        console.log(`\n✓ Saved ${pairs.length} ground truth pairs to ${outputPath}`);

        return stats;
    }
}

// ============================================================================
// Helper Functions
// ============================================================================

function extractGroundTruth(
    pairId: string,
    resume: TrainingResume,
    jd: JobDescription,
    atsResult: AtsScoreResult
): AtsGroundTruth {
    const criticalBreakdown = atsResult.categoryBreakdown?.critical || { matchedCount: 0, totalKeywords: 0 };
    const importantBreakdown = atsResult.categoryBreakdown?.important || { matchedCount: 0, totalKeywords: 0 };

    // Extract matched and missing keywords from the result
    const matchedKeywords = atsResult.strengths
        ?.filter(s => s.includes('matched') || s.includes('found'))
        .slice(0, 10) || [];

    const missingKeywords = atsResult.gaps
        ?.filter(g => g.includes('missing') || g.includes('lacks'))
        .slice(0, 10) || [];

    const totalKeywords = (criticalBreakdown.totalKeywords || 0) + (importantBreakdown.totalKeywords || 0);
    const totalMatched = (criticalBreakdown.matchedCount || 0) + (importantBreakdown.matchedCount || 0);
    const keywordCoverage = totalKeywords > 0 ? totalMatched / totalKeywords : 0;

    return {
        pairId,
        resumeCategory: resume.category || 'Unknown',
        jdDomain: jd.domain || 'Unknown',
        atsScore: atsResult.finalScore,
        keywordCoverage,
        criticalMatched: criticalBreakdown.matchedCount || 0,
        criticalTotal: criticalBreakdown.totalKeywords || 0,
        importantMatched: importantBreakdown.matchedCount || 0,
        importantTotal: importantBreakdown.totalKeywords || 0,
        matchedKeywords,
        missingKeywords,
        isGoodMatch: atsResult.finalScore >= 70,
        scoreInterpretation: atsResult.scoreInterpretation || '',
    };
}

function selectRandomItems<T>(items: T[], count: number): T[] {
    const arr = [...items];
    // Fisher-Yates shuffle (only shuffle first 'count' elements for efficiency)
    for (let i = 0; i < Math.min(count, arr.length); i++) {
        const j = i + Math.floor(Math.random() * (arr.length - i));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr.slice(0, count);
}

function calculateStats(
    pairs: GroundTruthPair[],
    scores: number[],
    processingTimeMs: number
): GenerationStats {
    const avgScore = scores.length > 0
        ? scores.reduce((a, b) => a + b, 0) / scores.length
        : 0;

    // Score distribution buckets
    const distribution: Record<string, number> = {
        '0-20': 0,
        '21-40': 0,
        '41-60': 0,
        '61-80': 0,
        '81-100': 0,
    };

    for (const score of scores) {
        if (score <= 20) distribution['0-20']++;
        else if (score <= 40) distribution['21-40']++;
        else if (score <= 60) distribution['41-60']++;
        else if (score <= 80) distribution['61-80']++;
        else distribution['81-100']++;
    }

    return {
        totalPairs: pairs.length,
        avgScore: Math.round(avgScore * 100) / 100,
        scoreDistribution: distribution,
        goodMatchCount: pairs.filter(p => p.groundTruth.isGoodMatch).length,
        processingTimeMs,
    };
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// Singleton
// ============================================================================

let defaultGenerator: AtsGroundTruthGenerator | null = null;

export function getAtsGroundTruthGenerator(): AtsGroundTruthGenerator {
    if (!defaultGenerator) {
        defaultGenerator = new AtsGroundTruthGenerator();
    }
    return defaultGenerator;
}
